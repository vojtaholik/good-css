import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFile, cp, mkdir, mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, relative } from "node:path";
import { checkFile } from "./check-css.mjs";

/* Gives each prompt in skill-evals.json to a fresh agent, with the skill and
   without it, grades what each run wrote, and adds one line per run to
   eval-results.jsonl.

     bun scripts/run-evals.js                    every prompt, both arms, three runs each
     bun scripts/run-evals.js --only <name>      one prompt
     bun scripts/run-evals.js --runs 1           one run per arm
     bun scripts/run-evals.js --regrade <folder> grade again what an earlier call left in <folder>

   Each run gets a folder outside the repo, empty or holding the prompt's
   fixtures from eval-fixtures/. The agent is `claude -p` with user settings,
   user skills and MCP servers off and only the file tools on, so the two
   arms differ by the skill and nothing else.

   An expectation is graded by any of these, and passes when all of them do:

     rule       no violation of that rule of check-css.mjs in a file the run wrote
     has        patterns that what the run added must hold
     lacks      patterns it must not hold
     unchanged  fixture files that must be as they were
     keeps      fixture files that must still hold every line they had

   "where": "reply" points has and lacks at the agent's last message in place
   of the files. A pass means the pattern is there, which is weaker than the
   sentence. An expectation with no check is recorded as null. No model
   grades anything, so the same output always gets the same grade.

   The output folders are temporary. Use --regrade after a change to a check,
   while the folder of the round still exists. */
const root = join(import.meta.dirname, "..");
const skill = join(root, "skills/good-css");
const fixtures = join(import.meta.dirname, "eval-fixtures");
const ledger = join(import.meta.dirname, "eval-results.jsonl");

const arms = ["with", "without"];
const concurrency = 6;
const minutes = 20;

const option = (name) => {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
};

const runs = Number(option("--runs") ?? 3);
const only = option("--only");
const regrade = option("--regrade");

const { evals } = JSON.parse(await readFile(join(import.meta.dirname, "skill-evals.json"), "utf8"));

async function filesUnder(folder, skip = []) {
  const names = await readdir(folder, { recursive: true, withFileTypes: true });
  return names
    .filter((entry) => entry.isFile() && entry.name !== ".DS_Store")
    .map((entry) => relative(folder, join(entry.parentPath, entry.name)))
    .filter((path) => !skip.some((prefix) => path.startsWith(prefix)))
    .sort();
}

/* The text of every file under the folders, by path. A later folder wins. */
async function readFolders(folders, skip) {
  const texts = new Map();
  for (const folder of folders) {
    for (const file of await filesUnder(folder, skip)) texts.set(file, await readFile(join(folder, file), "utf8"));
  }
  return texts;
}

const digest = (parts) => {
  const hash = createHash("sha256");
  for (const part of parts) hash.update(part);
  return hash.digest("hex").slice(0, 12);
};

const fixtureFolders = (item) => (item.fixtures ?? []).map((name) => join(fixtures, name));

/* Two lines of one prompt compare only when the same grader judged them:
   the prompt with its checks, its fixtures and check-css.mjs. */
const checker = await readFile(join(import.meta.dirname, "check-css.mjs"), "utf8");
const graderOf = async (item) => digest([JSON.stringify(item), checker, ...(await readFolders(fixtureFolders(item))).entries()].flat());

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
    reply: result?.result ?? "",
    facts: {
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
    },
  };
}

const list = (value) => [value ?? []].flat();
const linesOf = (text) => (text ?? "").split("\n");

/* Grades the folder a run left. The files it wrote are the new ones and the
   fixture files it changed. What it added is a new file whole, and of a
   changed file the lines the fixture did not have. */
async function grade(item, cwd, reply) {
  const before = await readFolders(fixtureFolders(item));
  const after = await readFolders([cwd], [".claude/"]);
  const written = [...after.keys()].filter((file) => after.get(file) !== before.get(file));

  const checked = written.map((file) => checkFile(join(cwd, file))).filter(Boolean);
  const violations = checked.length ? checked.flat() : null;
  const added = written
    .map((file) => {
      const had = new Set(linesOf(before.get(file)));
      return linesOf(after.get(file))
        .filter((line) => !had.has(line))
        .join("\n");
    })
    .join("\n");

  const results = item.expectations.map((expectation) => {
    const text = expectation.where === "reply" ? reply : added;
    const tests = [
      ...list(expectation.rule).map((rule) => (violations ? !violations.some((violation) => violation.rule === rule) : null)),
      ...list(expectation.has).map((pattern) => new RegExp(pattern, "i").test(text)),
      ...list(expectation.lacks).map((pattern) => !new RegExp(pattern, "i").test(text)),
      ...list(expectation.unchanged).map((file) => after.get(file) === before.get(file)),
      ...list(expectation.keeps).map((file) => linesOf(before.get(file)).every((line) => linesOf(after.get(file)).includes(line))),
    ];

    /* True, false, or null where nothing could be checked. */
    return [expectation.text, tests.length && !tests.includes(null) ? tests.every(Boolean) : null];
  });

  return { grader: await graderOf(item), files: written, results: Object.fromEntries(results) };
}

if (regrade) {
  const lines = (await readFile(ledger, "utf8"))
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  let changed = 0;

  for (const line of lines.filter((entry) => entry.round === basename(regrade))) {
    const cwd = join(regrade, `${line.eval}-${line.arm}-${line.run}`);
    const item = evals.find((entry) => entry.name === line.eval);
    const graded = await grade(item, cwd, readStream(await readFile(`${cwd}.jsonl`, "utf8")).reply);

    for (const [text, result] of Object.entries(graded.results)) {
      if (line.results[text] === result) continue;
      console.log(`${line.eval} ${line.arm} ${line.run}: ${line.results[text]} to ${result} for "${text}"`);
      changed++;
    }
    Object.assign(line, graded);
  }

  await writeFile(ledger, lines.map((line) => `${JSON.stringify(line)}\n`).join(""));
  console.log(`${changed} results changed.`);
  process.exit();
}

const chosen = evals.filter((item) => !only || item.name === only);
if (!chosen.length) throw new Error(`No eval is named "${only}".`);

const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const folder = await mkdtemp(join(tmpdir(), "good-css-evals-"));

/* The skill that was tested. A commit alone does not name it while the
   skill folder holds uncommitted changes. */
const stamp = {
  date: new Date().toISOString().slice(0, 10),
  round: basename(folder),
  commit: git("rev-parse", "--short", "HEAD"),
  uncommitted: git("status", "--porcelain", "--", "skills/good-css") !== "",
  skill: digest([...(await readFolders([skill])).entries()].flat()),
};

async function run(item, arm, number) {
  const name = `${item.name}-${arm}-${number}`;
  const cwd = join(folder, name);

  await mkdir(cwd, { recursive: true });
  for (const fixture of fixtureFolders(item)) await cp(fixture, cwd, { recursive: true });
  if (arm === "with") {
    await cp(skill, join(cwd, ".claude/skills/good-css"), { recursive: true, filter: (path) => !path.endsWith(".DS_Store") });
  }

  const stream = await agent(item.prompt, cwd);
  await writeFile(`${cwd}.jsonl`, stream);

  const { reply, facts } = readStream(stream);
  const line = { ...stamp, eval: item.name, arm, run: number, ...facts, ...(await grade(item, cwd, reply)) };

  await appendFile(ledger, `${JSON.stringify(line)}\n`);
  console.log(`${name}: ${line.error ?? `${line.files.length ? line.files.join(", ") : "no files"}, ${line.seconds}s`}`);
  return line;
}

const queue = chosen.flatMap((item) => arms.flatMap((arm) => Array.from({ length: runs }, (_, index) => () => run(item, arm, index + 1))));

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
    const graded = of(arm)
      .map((line) => line.results[text])
      .filter((result) => result !== null);
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
