#!/usr/bin/env node
import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

/* Checks CSS against the rules under "In all CSS" in SKILL.md that can be
   read off the text with no judgment.

     node check.mjs styles.css page.html

   A .css file is read whole. Any other file is read for its <style> blocks.
   Each violation prints as path:line and what to write instead, and the exit
   code is 1 when there is one.

   Left to the reader: whether everything pressable has an :active state,
   whether sizes sit in one clamp() token, and whether an overflow: hidden
   is on something a script scrolls. */

/* The duration rule of the "Motion tokens" entry. */
const limit = 300;
const modalLimit = 500;
const modal = /dialog|modal|drawer/i;

const moves = ["transform", "translate", "scale", "rotate"];
const logicalSide = { top: "block-start", bottom: "block-end", left: "inline-start", right: "inline-end" };
const corner = { top: "start", bottom: "end", left: "start", right: "end" };

/* Words in a transition that are not the name of a property. */
const keywords = ["ease", "linear", "ease-in", "ease-out", "ease-in-out", "step-start", "step-end", "allow-discrete", "normal"];
const noTransition = ["none", "inherit", "initial", "unset", "revert", "revert-layer"];

/* Comments, strings and url() become spaces, so nothing in them is read as
   CSS and every line number stays where it was. */
const blank = (text, pattern) => text.replace(pattern, (match) => match.replace(/[^\n]/g, " "));
const quiet = (css) => blank(css, /\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|url\([^)]*\)/g);

/* Everything outside <style> becomes spaces. */
const styleBlocks = (html) => {
  const kept = html.replace(/[^\n]/g, " ").split("");
  for (const match of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
    const start = match.index + match[0].indexOf(">") + 1;
    for (let index = 0; index < match[1].length; index++) kept[start + index] = match[1][index];
  }
  return kept.join("");
};

/* Splits on a separator that sits outside parentheses. */
function split(value, separator) {
  const parts = [""];
  let depth = 0;
  for (const char of value) {
    if (char === "(") depth++;
    if (char === ")") depth--;
    if (depth === 0 && separator.test(char)) parts.push("");
    else parts[parts.length - 1] += char;
  }
  return parts.map((part) => part.trim()).filter(Boolean);
}

const milliseconds = (word) => {
  const time = word.match(/^(\d*\.?\d+)(ms|s)$/i);
  return time ? Number(time[1]) * (time[2].toLowerCase() === "s" ? 1000 : 1) : null;
};

/* One item of a transition: the properties it names and how long it takes.
   An item that names none transitions everything, unless a var() could be
   holding the name. */
function readTransition(item) {
  const words = split(item, /\s/);
  const lower = words.map((word) => word.toLowerCase());
  const properties = lower.filter((word) => /^-{0,2}[a-z_][\w-]*$/.test(word) && !keywords.includes(word));
  const off = lower.some((word) => noTransition.includes(word));
  const open = lower.some((word) => word.startsWith("var("));
  return {
    properties: off ? [] : properties,
    everything: !off && (properties.includes("all") || (properties.length === 0 && !open)),
    duration: lower.map(milliseconds).find((time) => time !== null) ?? null,
  };
}

/* Yields each rule and each declaration with the blocks it sits in. */
function* read(css) {
  const text = quiet(css);
  const blocks = [];
  let chunk = "";
  let chunkLine = null;
  let line = 1;

  for (const char of text) {
    if (char === "{" || char === "}" || char === ";") {
      const source = chunk.trim();
      const at = chunkLine ?? line;
      if (char === "{") {
        yield { type: "rule", prelude: source, line: at, blocks: [...blocks] };
        blocks.push(source);
      } else {
        const colon = source.indexOf(":");
        if (colon > 0 && !source.startsWith("@")) {
          yield {
            type: "declaration",
            property: source.slice(0, colon).trim().toLowerCase(),
            value: source.slice(colon + 1).trim(),
            line: at,
            blocks: [...blocks],
          };
        }
        if (char === "}") blocks.pop();
      }
      chunk = "";
      chunkLine = null;
    } else {
      if (chunkLine === null && /\S/.test(char)) chunkLine = line;
      chunk += char;
    }
    if (char === "\n") line++;
  }
}

function logical(property) {
  let match;
  if ((match = property.match(/^(top|right|bottom|left)$/))) return `inset-${logicalSide[match[1]]}`;
  if ((match = property.match(/^(margin|padding|scroll-margin|scroll-padding)-(top|right|bottom|left)$/)))
    return `${match[1]}-${logicalSide[match[2]]}`;
  if ((match = property.match(/^border-(top|bottom)-(left|right)-radius$/)))
    return `border-${corner[match[1]]}-${corner[match[2]]}-radius`;
  if ((match = property.match(/^border-(top|right|bottom|left)(-width|-style|-color)?$/)))
    return `border-${logicalSide[match[1]]}${match[2] ?? ""}`;
  return null;
}

const reducedMotion = (blocks) => blocks.some((block) => /prefers-reduced-motion\s*:\s*no-preference/.test(block));

/* Returns the violations in a piece of CSS as { line, rule, message }. */
export function check(css) {
  const found = [];
  const nodes = [...read(css)];

  /* Motion is opt-in when the transition or the value it animates sits in
     the query. So a transition outside it counts only for a property that
     is also set outside it. */
  const setForEveryone = new Set(
    nodes
      .filter((node) => node.type === "declaration" && moves.includes(node.property) && !reducedMotion(node.blocks))
      .map((node) => node.property),
  );

  for (const node of nodes) {
    const report = (rule, message) => found.push({ line: node.line, rule, message });
    const queries = node.blocks.filter((block) => block.startsWith("@media")).join(" ");
    const selectors = node.blocks.filter((block) => !block.startsWith("@")).join(" ");

    if (node.type === "rule") {
      const gated = /\(\s*hover\s*:\s*hover\s*\)/.test(queries) && /\(\s*pointer\s*:\s*fine\s*\)/.test(queries);
      if (!node.prelude.startsWith("@") && /:hover\b/.test(node.prelude) && !gated)
        report("hover", "Put this `:hover` rule inside `@media (hover: hover) and (pointer: fine)`.");
      continue;
    }

    const { property, value } = node;
    const lower = value.toLowerCase();

    const replacement = logical(property);
    if (replacement) report("logical", `\`${property}\` is physical. Write \`${replacement}\`.`);
    if (property === "text-align" && /^(left|right)\b/.test(lower))
      report("logical", `\`text-align: ${lower}\` is physical. Write \`${lower.startsWith("left") ? "start" : "end"}\`.`);

    if ((property === "outline" && /^(none|0)\b/.test(lower)) || (property === "outline-style" && lower.startsWith("none")))
      report("outline", "Never remove the outline. Style focus with `:focus-visible` and `outline`.");

    if (/(?<![\w-])ease-in(?![\w-])/.test(lower)) report("ease-in", "Never use `ease-in`. Use an ease-out curve.");

    /* A mask reads only the alpha of its colors. */
    if (!/^(-webkit-)?mask(-image)?$/.test(property) && /#[0-9a-f]{3,8}(?![\w-])|(?<![\w-])(rgba?|hsla?)\(/.test(lower))
      report("color", "Write the color in `oklch()`, with `none` as the hue of a gray, white or black.");

    if (property !== "transition" && property !== "transition-property" && property !== "transition-duration") continue;

    const ceiling = modal.test(selectors) ? modalLimit : limit;
    const items = property === "transition-duration" ? [] : split(value, /,/).map(readTransition);
    const durations =
      property === "transition-duration"
        ? split(lower, /,/).map(milliseconds)
        : property === "transition"
          ? items.map((item) => item.duration)
          : [];

    if (items.some((item) => item.everything)) report("transition-all", "Name the properties the transition changes, never `all`.");

    const moving = items.flatMap((item) => item.properties).find((name) => setForEveryone.has(name));
    if (moving && !reducedMotion(node.blocks))
      report("motion", `Put the transition of \`${moving}\` inside \`@media (prefers-reduced-motion: no-preference)\`.`);

    const slow = durations.find((time) => time !== null && time > ceiling);
    if (slow !== undefined)
      report("duration", `${slow}ms is over the limit. Keep a transition at ${limit}ms or less, or ${modalLimit}ms for a modal or drawer.`);
  }

  return found;
}

/* Returns null for a file that holds no CSS this can read. */
export const checkFile = (path) => {
  const text = readFileSync(path, "utf8");
  if (path.endsWith(".css")) return check(text);
  return /<style\b/i.test(text) ? check(styleBlocks(text)) : null;
};

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const paths = process.argv.slice(2);
  if (!paths.length) {
    console.error("Usage: node check.mjs <file> [<file> …]");
    process.exit(2);
  }

  let checked = 0;
  let count = 0;
  for (const path of paths) {
    const violations = checkFile(path);
    if (!violations) {
      console.log(`${path} Not checked. It has no <style> block.`);
      continue;
    }
    checked++;
    for (const violation of violations) {
      console.log(`${path}:${violation.line} ${violation.message}`);
      count++;
    }
  }

  if (count) process.exit(1);
  console.log(`No violations in ${checked} ${checked === 1 ? "file" : "files"}.`);
}
