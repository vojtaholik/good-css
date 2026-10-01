import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFile, cp, mkdir, mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, relative } from "node:path";
import { checkFile } from "./check-css.mjs";

/* Gives each prompt in skill-evals.json to a fresh agent, with the skill and
   without it, grades the files each run wrote, and appends one line per run
   to eval-results.jsonl.

     bun scripts/run-evals.js                    every prompt, both arms, three runs each
     bun scripts/run-evals.js --only <name>      one prompt
     bun scripts/run-evals.js --runs 1           one run per arm

   Each run gets an empty folder outside the repo. The agent is `claude -p`
   with user settings, user skills and MCP servers off and only the file
   tools on, so the two arms differ by the skill and nothing else.

   An expectation is graded by a rule of check-css.mjs, by patterns the output
   must hold or must lack, or by all of them. A pass means the pattern is
   there, which is weaker than the sentence. An expectation with no check is
   recorded as null. No model grades anything, so the grader cannot change
   between two runs of the same commit. */
const root = join(import.meta.dirname, "..");
const skill = join(root, "skills/good-css");
const ledger = join(import.meta.dirname, "eval-results.jsonl");
const evalsPath = join(import.meta.dirname, "skill-evals.json");

const arms = ["with", "without"];
const concurrency = 6;
const minutes = 20;

const option = (name) => {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
};

const runs = Number(option("--runs") ?? 3);
const only = option("--only");

const { evals } = JSON.parse(await readFile(evalsPath, "utf8"));
const chosen = evals.filter((item) => !only || item.name === only);
if (!chosen.length) throw new Error(`No eval is named "${only}".`);

async function filesUnder(folder, skip = []) {
  const names = await readdir(folder, { recursive: true, withFileTypes: true });
  return names
    .filter((entry) => entry.isFile() && entry.name !== ".DS_Store")
    .map((entry) => relative(folder, join(entry.parentPath, entry.name)))
    .filter((path) => !skip.some((prefix) => path.startsWith(prefix)))
    .sort();
}

const digest = async (paths) => {
  const hash = createHash("sha256");
  for (const path of paths) hash.update(path.name).update(await readFile(path.file));
  return hash.digest("hex").slice(0, 12);
};

const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();

/* What a line needs so that two lines can be compared: the skill that was
   tested and the grader that judged it. A commit alone names neither while
   the skill folder holds uncommitted changes. */
const skillFiles = await filesUnder(skill);
const stamp = {
  date: new Date().toISOString().slice(0, 10),
  commit: git("rev-parse", "--short", "HEAD"),
  uncommitted: git("status", "--porcelain", "--", "skills/good-css") !== "",
  skill: await digest(skillFiles.map((name) => ({ name, file: join(skill, name) }))),
  grader: await digest([
    { name: "skill-evals.json", file: evalsPath },
    { name: "check-css.mjs", file: join(import.meta.dirname, "check-css.mjs") },
  ]),
};

function agent(prompt, cwd) {
  return new Promise((resolve) => {
    const child = spawn(
      "claude",
      [
        "-p",
        prompt,
        "--output-format",
        "stream-json",
        "--verbose",
        "--setting-sources",
        "project",
        "--strict-mcp-config",
        "--no-session-persistence",
        "--permission-mode",
        "acceptEdits",
        "--tools",
        "Read,Write,Edit,Glob,Grep,Skill",
        "--max-budget-usd",
        "5",
      ],
      { cwd, stdio: ["ignore", "pipe", "ignore"] },
    );

    let stream = "";
    child.stdout.on("data", (chunk) => (stream += chunk));

    const timer = setTimeout(() => child.kill(), minutes * 60 * 1000);
    child.on("close", () => {
      clearTimeout(timer);
      resolve(stream);
    });
  });
}

/* The stream is one JSON object per line: what the session loaded, each
   message with its tool calls, and a result with the usage. */
function readStream(stream) {
  const events = stream
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  const calls = events
    .filter((event) => event.type === "assistant")
    .flatMap((event) => event.message.content.filter((block) => block.type === "tool_use"));
  const read = calls.filter((call) => call.name === "Read").map((call) => call.input.file_path ?? "");
  const init = events.find((event) => event.type === "system" && event.subtype === "init");
  const result = events.find((event) => event.type === "result");
  const usage = result?.usage ?? {};

  return {
    model: init?.model ?? null,
    cli: init?.claude_code_version ?? null,
    triggered:
      calls.some((call) => call.name === "Skill" && call.input.skill?.endsWith("good-css")) ||
      read.some((path) => path.endsWith("skills/good-css/SKILL.md")),
    references: [...new Set(read.filter((path) => path.includes("skills/good-css/references/")).map((path) => basename(path)))].sort(),
    input_tokens: (usage.input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0),
    output_tokens: usage.output_tokens ?? 0,
    cost_usd: result ? Number(result.total_cost_usd.toFixed(2)) : null,
    turns: result?.num_turns ?? null,
    seconds: result ? Math.round(result.duration_ms / 1000) : null,
    ...(result && !result.is_error ? {} : { error: result?.subtype ?? "no result" }),
  };
}

const list = (value) => [value ?? []].flat();

/* True, false, or null where nothing could be checked. */
function grade(expectation, text, violations) {
  const tests = [
    ...list(expectation.rule).map((rule) => (violations ? !violations.some((violation) => violation.rule === rule) : null)),
    ...list(expectation.has).map((pattern) => new RegExp(pattern, "i").test(text)),
    ...list(expectation.lacks).map((pattern) => !new RegExp(pattern, "i").test(text)),
  ];

  return tests.length && !tests.includes(null) ? tests.every(Boolean) : null;
}

async function run(folder, item, arm, number) {
  const name = `${item.name}-${arm}-${number}`;
  const cwd = join(folder, name);

  await mkdir(cwd, { recursive: true });
  if (arm === "with") {
    await cp(skill, join(cwd, ".claude/skills/good-css"), { recursive: true, filter: (path) => !path.endsWith(".DS_Store") });
  }

  const stream = await agent(item.prompt, cwd);
  await writeFile(join(folder, `${name}.jsonl`), stream);

  const files = await filesUnder(cwd, [".claude/"]);
  const checked = files.map((file) => checkFile(join(cwd, file))).filter(Boolean);
  const violations = checked.length ? checked.flat() : null;
  const text = (await Promise.all(files.map((file) => readFile(join(cwd, file), "utf8")))).join("\n");

  const line = {
    ...stamp,
    eval: item.name,
    arm,
    run: number,
    ...readStream(stream),
    files,
    results: Object.fromEntries(item.expectations.map((expectation) => [expectation.text, grade(expectation, text, violations)])),
  };

  await appendFile(ledger, `${JSON.stringify(line)}\n`);
  console.log(`${name}: ${line.error ?? `${files.length ? files.join(", ") : "no files"}, ${line.seconds}s`}`);
  return line;
}

const folder = await mkdtemp(join(tmpdir(), "good-css-evals-"));
const queue = chosen.flatMap((item) =>
  arms.flatMap((arm) => Array.from({ length: runs }, (_, index) => () => run(folder, item, arm, index + 1))),
);

console.log(`${queue.length} runs of skill ${stamp.skill} at ${stamp.commit}${stamp.uncommitted ? ", with uncommitted changes" : ""}. Output in ${folder}`);

const lines = [];
await Promise.all(
  Array.from({ length: concurrency }, async () => {
    while (queue.length) lines.push(await queue.shift()());
  }),
);

/* How many runs passed each expectation, with the skill and without it. */
for (const item of chosen) {
  const of = (arm) => lines.filter((line) => line.eval === item.name && line.arm === arm);
  const count = (arm, text) => {
    const graded = of(arm).map((line) => line.results[text]).filter((result) => result !== null);
    return graded.length ? `${graded.filter(Boolean).length}/${graded.length}` : "-";
  };
  const mean = (arm, key) => Math.round(of(arm).reduce((sum, line) => sum + (line[key] ?? 0), 0) / of(arm).length);

  console.log(`\n${item.name}`);
  console.log("with  without");
  for (const { text } of item.expectations) console.log(`${count("with", text).padEnd(6)}${count("without", text).padEnd(9)}${text}`);
  console.log(`Input tokens per run: ${mean("with", "input_tokens")} with, ${mean("without", "input_tokens")} without.`);
  console.log(`Skill triggered in ${of("with").filter((line) => line.triggered).length} of ${of("with").length} runs.`);
  console.log(`Reference files read: ${of("with").map((line) => line.references.length).join(", ")}.`);
}
