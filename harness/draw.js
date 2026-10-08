/* Draws the index from PRACTICES.md, the fixtures and the drawings. The
   build runs it once, through main.js, and the page it publishes is already
   drawn, so a browser on the site never loads this file. Only the dev
   server's page arrives empty and has it drawn here. */

/* Prism's core and the three languages an entry is written in. The full
   bundle adds plugins that reach for the DOM, and the build has none. */
import Prism from "prismjs/components/prism-core";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-css";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-javascript";
import { readPractices } from "./practices.js";
import { demos } from "./demos/index.js";
import heroDrawing from "./hero.svg?raw";

const practices = readPractices();
const { categories, entries } = practices;

/* The drawing of each category, named by the slug of its title. It goes into
   the page as markup, so its lines take the color of what holds it. */
const drawings = import.meta.glob("./categories/*.svg", { query: "?raw", import: "default", eager: true });
const drawing = (category) => drawings[`./categories/${category.slug}.svg`] ?? "";

const stamp = (id) => document.getElementById(id).content.cloneNode(true);
const slot = (root, name) => root.querySelector(`[data-slot="${name}"]`);
const pad = (number) => String(number).padStart(2, "0");
const plural = (count, word, words = `${word}s`) => `${count} ${count === 1 ? word : words}`;

function element(tag, className, html) {
  const node = document.createElement(tag);

  if (className) node.className = className;
  if (html !== undefined) node.innerHTML = html;

  return node;
}

/* The bands alternate under the categories band: light, then dark. A frame
   is drawn the other way round, so it stands out from its band: a dark panel
   on a light band, a light panel on a dark one. */
const tone = (index) => (index % 2 ? "dark" : "light");

function specimen(entry, demo, band) {
  const node = stamp("specimen");
  const url = `/specimen/${entry.slug}${band === "dark" ? "?panel=light" : ""}`;
  const frame = slot(node, "frame");

  frame.src = url;
  frame.title = `Specimen: ${entry.slug}`;
  /* A frame loads its specimen as it nears the screen, not all of them with the page. */
  frame.setAttribute("loading", "lazy");
  node.querySelector(".viewport").style.setProperty("--frame-height", `${demo.height}px`);
  slot(node, "check").innerHTML = demo.check;
  slot(node, "open").href = url;

  return node;
}

function noSpecimen(entry) {
  const node = stamp("no-specimen");
  slot(node, "file").textContent = `harness/demos/${entry.slug}.html`;
  return node;
}

/* A code block with its line numbers beside it. The numbers stay put while a
   long line scrolls. Prism colors the code: CSS, HTML and JS are in its core. */
const languages = { css: "css", html: "markup", js: "javascript" };

function codeBlock({ lang, text }) {
  const block = element("div", "code-block");
  const lines = text.split("\n").length;
  const language = Prism.languages[languages[lang]];

  block.append(
    element("span", "code-lines", Array.from({ length: lines }, (_, line) => line + 1).join("\n")),
    element("pre", "", `<code>${language ? Prism.highlight(text, language, lang) : text}</code>`),
  );
  block.firstElementChild.setAttribute("aria-hidden", "true");

  return block;
}

const sourcePart = (part) => (part.html ? element("div", "source-text", part.html) : codeBlock(part));

/* "CSS · 2 blocks · 20 lines", from the code of the entry. */
function codeMeta(source) {
  const blocks = source.filter((part) => part.lang);
  const langs = [...new Set(blocks.map((block) => block.lang.toUpperCase()))];
  const lines = blocks.reduce((sum, block) => sum + block.text.split("\n").length, 0);

  return [...langs, blocks.length > 1 && plural(blocks.length, "block"), plural(lines, "line")].filter(Boolean).join(" · ");
}

/* "5 reasons · 7 rules · support · credits", from the notes of the entry. */
function notesMeta(notes) {
  return [
    notes.reasons.length && plural(notes.reasons.length, "reason"),
    notes.rules.length && plural(notes.rules.length, "rule"),
    notes.support && "support",
    notes.credits.length && "credits",
  ]
    .filter(Boolean)
    .join(" · ");
}

/* One part of the notes: its label on one side, its text on the other. */
function note(label, body) {
  const section = element("section", "note");

  section.append(element("h4", "note-label label", label), body);
  return section;
}

const numbered = (items) => element("ol", "note-items", items.map((html) => `<li><div>${html}</div></li>`).join(""));

function support({ browsers, html }) {
  const body = element("div", "note-body");

  if (browsers.length) {
    body.append(
      element(
        "dl",
        "browsers",
        browsers.map(({ name, version }) => `<div data-browser="${name}"><dt>${name}</dt><dd>${version}</dd></div>`).join(""),
      ),
    );
  }

  if (html) body.append(element("p", "", html));
  return body;
}

function notes({ reasons, rules, support: line, other, credits }) {
  return [
    reasons.length && note("Why it works", numbered(reasons)),
    rules.length && note("Rules", numbered(rules)),
    line && note("Support", support(line)),
    ...other.map(({ label, html }) => note(label || "Notes", element("div", "note-body", `<p>${html}</p>`))),
    credits.length &&
      note(
        "Credits",
        element("div", "note-body credits", credits.map(({ kind, html }) => `<p><strong>${kind}:</strong> ${html}</p>`).join("")),
      ),
  ].filter(Boolean);
}

function entry(entry, band) {
  const node = stamp("entry");
  const demo = demos[entry.slug];

  node.firstElementChild.id = entry.slug;
  slot(node, "ghost").textContent = pad(entry.number);
  slot(node, "number").textContent = pad(entry.number);
  slot(node, "title").innerHTML = entry.title;
  slot(node, "lede").innerHTML = entry.lede;
  slot(node, "specimen").replaceWith(demo ? specimen(entry, demo, band) : noSpecimen(entry));
  slot(node, "code-meta").textContent = codeMeta(entry.source);
  slot(node, "source").replaceChildren(...entry.source.map(sourcePart));
  slot(node, "notes-meta").textContent = notesMeta(entry.notes);
  slot(node, "notes").replaceChildren(...notes(entry.notes));

  return node;
}

/* Each category has a timeline that runs while it is under the header, and
   the header's button and list read it. The name is all the script gives:
   the CSS does the rest. */
const timeline = (category) => `--in-${category.slug}`;

function indexItem(entry) {
  const item = element("li");
  item.append(element("a", "", `<span class="label">${pad(entry.number)}</span> <span>${entry.title}</span>`));
  item.firstElementChild.href = `#${entry.slug}`;
  return item;
}

function category(category, index) {
  const node = stamp("category");
  const section = node.firstElementChild;
  const band = tone(index);
  const list = slot(node, "index");

  section.id = category.slug;
  section.classList.add(band === "dark" ? "band-dark" : "band-tint");
  section.setAttribute("style", `view-timeline-name: ${timeline(category)}`);
  slot(node, "ghost").textContent = pad(index + 1);
  slot(node, "number").textContent = pad(index + 1);
  slot(node, "of").textContent = `/ ${pad(categories.length)}`;
  slot(node, "count").textContent = plural(category.entries.length, "entry", "entries");
  slot(node, "title").textContent = category.title;
  slot(node, "art").innerHTML = drawing(category);
  /* The index fills its first column, then its second. */
  list.setAttribute("style", `--rows: ${Math.ceil(category.entries.length / 2)}`);
  list.replaceChildren(...category.entries.map(indexItem));
  slot(node, "entries").replaceChildren(...category.entries.map((item) => entry(item, band)));

  return node;
}

function card(category) {
  const node = stamp("card");

  node.querySelector("a").href = `#${category.slug}`;
  slot(node, "title").textContent = category.title;
  slot(node, "art").innerHTML = drawing(category);
  slot(node, "count").textContent = category.entries.length;

  return node;
}

function phase(category, index) {
  const item = element("li");
  const button = element("button", "", `<span class="label">${pad(index + 1)}</span>`);

  button.type = "button";
  button.setAttribute("aria-label", category.title);
  item.append(button);

  return item;
}

/* The name of a category in the header's button. Only the one whose category
   is in view shows. */
function currentName(category) {
  const name = element("span");

  name.textContent = category.title;
  name.setAttribute("style", `animation-timeline: ${timeline(category)}`);

  return name;
}

function menuItem(category) {
  const item = element("li");
  const link = element("a");

  link.href = `#${category.slug}`;
  link.textContent = category.title;
  link.setAttribute("style", `animation-timeline: ${timeline(category)}`);
  item.append(link);

  return item;
}

function footerDrawing(category) {
  return element("span", "art", drawing(category));
}

/* The drawing of the hero goes in as markup too. */
slot(document, "hero-art").innerHTML = heroDrawing;

/* Every count on the page is read from PRACTICES.md. */
for (const count of document.querySelectorAll('[data-slot="entry-count"]')) count.textContent = entries.length;
slot(document, "category-count").textContent = categories.length;
slot(document, "range").textContent = `01 — ${pad(categories.length)}`;
slot(document, "total").textContent = pad(categories.length);
slot(document, "cards").replaceChildren(...categories.map(card));
slot(document, "phases").replaceChildren(...categories.map(phase));
slot(document, "categories").replaceChildren(...categories.map(category));
slot(document, "footer-art").replaceChildren(...categories.map(footerDrawing));
/* The first name is "Categories", from the header. The rest follow it. */
const names = slot(document, "category-names");
names.replaceChildren(names.firstElementChild, ...categories.map(currentName));
slot(document, "category-menu").replaceChildren(...categories.map(menuItem));

/* The header is outside the categories, so their timelines are named on the
   body for it to see. `timeline-scope: all` would need no list, and Chrome
   does not have it. */
document.body.setAttribute("style", `timeline-scope: --in-categories, ${categories.map(timeline).join(", ")}`);

for (const link of document.querySelectorAll('.notes a[href^="http"]')) link.target = "_blank";
