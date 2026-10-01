import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { marked } from "marked";
import { check } from "./check-css.mjs";

/* Writes the skill's reference files from PRACTICES.md, so an entry is
   written in one place only.

     bun scripts/build-skill.js           writes skills/good-css/references
     bun scripts/build-skill.js --check   fails if they are out of date

   An entry keeps its title, when to use it, the code, the rules and the
   support line. "Why it works" and the credits stay in PRACTICES.md.

   Both forms stop when the CSS of an entry breaks a rule that SKILL.md
   gives for all CSS. */
const root = join(import.meta.dirname, "..");
const skill = join(root, "skills/good-css");
const references = join(skill, "references");

/* One file per kind of task, so a task reads one or two of them. Entries are
   named by the slug of their title, as the harness fixtures are, so
   renumbering PRACTICES.md changes nothing here. An unnumbered section goes
   in by the slug of its heading. */
const files = {
  foundation: [
    "the-reset",
    "oklch-color",
    "one-set-of-color-tokens-for-light-and-dark",
    "fluid-sizes-with-clamp",
    "one-fluid-scale-for-type-and-space",
    "left-out-on-purpose",
  ],
  layout: [
    "content-grid-with-breakouts",
    "section-spacing-that-depends-on-its-neighbors",
    "space-between-siblings-set-by-the-parent",
    "push-one-item-away-with-an-auto-margin",
    "intrinsic-grid",
    "subgrid-rows-shared-across-cards",
    "container-queries-with-container-units",
    "sidebar-that-wraps-on-its-own",
    "stack-layers-with-grid",
    "safe-alignment",
    "logical-properties",
    "overflow-clip-over-hidden",
  ],
  controls: [
    "one-focus-ring-with-focus-visible",
    "hover-styles-only-where-hover-exists",
    "press-feedback",
    "hit-area-larger-than-the-visual",
    "whole-card-clickable-from-one-link",
    "has-for-parent-and-page-state",
    "form-feedback-with-user-invalid",
    "textarea-that-grows-with-its-content",
    "label-centered-on-its-letters-with-text-box",
    "icon-sized-by-the-text-beside-it",
    "tabular-numbers",
    "concentric-nested-radius",
  ],
  content: [
    "long-text-that-wraps-truncates-or-clamps",
    "image-box-that-holds-any-upload",
  ],
  motion: [
    "opt-in-motion",
    "motion-tokens",
    "transition-a-custom-property-with-property",
    "shadow-change-that-fades-and-does-not-repaint",
    "cross-document-view-transitions",
  ],
  disclosure: [
    "enter-and-exit-transitions-from-display-none",
    "popover-anchored-to-its-trigger",
    "reveal-with-clip-path",
    "accordion-that-animates-its-height",
    "indicator-that-slides-to-the-active-item",
  ],
  scroll: [
    "carousel-on-native-scroll",
    "scroll-area-between-a-fixed-header-and-footer",
    "styles-that-apply-only-when-a-scroller-overflows",
    "anchor-targets-that-clear-a-sticky-header",
    "no-rubber-band-bounce-on-desktop",
    "content-clear-of-the-notch",
  ],
};

/* Sections of PRACTICES.md that are about the list and not for its reader. */
const skipped = ["next", "references"];

const credit = /^(Borrowed from|Docs|Background|Source):/;
const localPath = /^- Source:|~\/|\/Users\//m;

const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function readSections(source) {
  const sections = [];
  let line = 1;

  for (const token of marked.lexer(source)) {
    token.line = line;
    line += token.raw.split("\n").length - 1;

    if (token.type === "heading" && token.depth === 2) {
      const numbered = token.text.match(/^(\d+)\.\s+(.+)$/);
      sections.push({
        number: numbered ? Number(numbered[1]) : null,
        slug: slugify(numbered ? numbered[2] : token.text),
        tokens: [token],
      });
    } else sections.at(-1)?.tokens.push(token);
  }

  return sections;
}

/* Drops "Why it works" with its list, and the credit lines. A list of rules
   and the credits under it can lex as one list, so credits go item by item. */
function trim(tokens) {
  const body = tokens.filter((token) => token.type !== "space");
  const why = body.findIndex((token) => token.type === "paragraph" && token.text === "Why it works:");
  if (why !== -1) body.splice(why, body[why + 1]?.type === "list" ? 2 : 1);

  return body
    .map((token) => {
      if (token.type !== "list") return token.raw.trim();
      const items = token.items.filter((item) => !credit.test(item.text));
      return items.map((item) => item.raw.trim()).join("\n");
    })
    .filter(Boolean)
    .join("\n\n");
}

const sections = readSections(await readFile(join(root, "PRACTICES.md"), "utf8"));
const fileOf = new Map(Object.entries(files).flatMap(([file, slugs]) => slugs.map((slug) => [slug, file])));

const unplaced = sections.filter((section) => !fileOf.has(section.slug) && !skipped.includes(section.slug));
const missing = [...fileOf.keys()].filter((slug) => !sections.some((section) => section.slug === slug));
if (unplaced.length || missing.length) {
  for (const section of unplaced) console.error(`No file for "${section.slug}". Add it to \`files\`.`);
  for (const slug of missing) console.error(`"${slug}" is in \`files\` and not in PRACTICES.md.`);
  process.exit(1);
}

/* An agent copies an entry's code as written, so the code has to follow the
   rules itself. A fence opens one line above its code. */
const broken = sections.flatMap((section) =>
  section.tokens
    .filter((token) => token.type === "code" && token.lang === "css")
    .flatMap((token) => check(token.text).map((violation) => `PRACTICES.md:${token.line + violation.line} ${violation.message}`)),
);
if (broken.length) {
  for (const violation of broken) console.error(violation);
  process.exit(1);
}

/* "Entry 31" means nothing to a reader holding one file, so a reference to
   an entry in another file names that file. */
const fileOfNumber = new Map(sections.map((section) => [section.number, fileOf.get(section.slug)]));
const locate = (text, file) =>
  text.replace(/\bentry (\d+)\b/gi, (match, number) => {
    const target = fileOfNumber.get(Number(number));
    return target && target !== file ? `${match} (\`${target}.md\`)` : match;
  });

const output = new Map(
  Object.entries(files).map(([file, slugs]) => {
    const body = slugs.map((slug) => trim(sections.find((section) => section.slug === slug).tokens));
    return [
      `${file}.md`,
      `<!-- Generated from PRACTICES.md by scripts/build-skill.js. Do not edit. -->\n\n${locate(body.join("\n\n"), file)}\n`,
    ];
  }),
);

/* The repo is public and PRACTICES.md cites files on the author's machine. */
for (const [name, text] of output) {
  if (localPath.test(text)) throw new Error(`${name} holds a local path or a "- Source:" line.`);
}

/* SKILL.md is written by hand and has to say when to read each file. */
const skillMd = await readFile(join(skill, "SKILL.md"), "utf8");
for (const name of output.keys()) {
  if (!skillMd.includes(`references/${name}`)) throw new Error(`SKILL.md never points at references/${name}.`);
}

if (process.argv.includes("--check")) {
  const names = await readdir(references).catch(() => []);
  const onDisk = new Map(
    await Promise.all(names.map(async (name) => [name, await readFile(join(references, name), "utf8")])),
  );
  const stale = [...new Set([...output.keys(), ...names])].filter((name) => output.get(name) !== onDisk.get(name));
  if (stale.length) {
    console.error(`Out of date: ${stale.join(", ")}. Run bun scripts/build-skill.js.`);
    process.exit(1);
  }
} else {
  await rm(references, { recursive: true, force: true });
  await mkdir(references, { recursive: true });
  for (const [name, text] of output) await writeFile(join(references, name), text);
  console.log(`Wrote ${output.size} files to skills/good-css/references.`);
}
