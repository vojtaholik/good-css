import { readPractices } from "./practices.js";
import { demos } from "./demos/index.js";

const practices = readPractices();

const stamp = (id) => document.getElementById(id).content.cloneNode(true);
const slot = (root, name) => root.querySelector(`[data-slot="${name}"]`);
const pad = (number) => String(number).padStart(2, "0");

function specimen(entry, demo) {
  const node = stamp("specimen");
  const url = `/specimen/${entry.slug}`;
  const viewport = node.querySelector(".viewport");
  const frame = slot(node, "frame");
  const size = slot(node, "size");
  const widths = node.querySelectorAll("[data-width]");

  frame.src = url;
  frame.title = `Specimen ${entry.number}`;
  viewport.style.setProperty("--frame-height", `${demo.height}px`);
  slot(node, "check").innerHTML = demo.check;
  slot(node, "open").href = url;

  for (const button of widths) {
    button.addEventListener("click", () => (viewport.style.width = button.dataset.width));
  }

  /* The pressed button is read off the frame, so dragging the corner clears it. */
  new ResizeObserver(([{ contentBoxSize }]) => {
    const [{ inlineSize, blockSize }] = contentBoxSize;
    const width = viewport.style.width || "100%";

    size.textContent = `[ ${Math.round(inlineSize)} × ${Math.round(blockSize)} ]`;
    for (const button of widths) button.setAttribute("aria-pressed", button.dataset.width === width);
  }).observe(frame);

  return node;
}

function noSpecimen(entry) {
  const node = stamp("no-specimen");
  slot(node, "file").textContent = `harness/demos/${entry.slug}.html`;
  return node;
}

/* Which kinds of code block the entry runs, with a count where there are several. */
function codeCount(code) {
  const kinds = Object.entries(code)
    .filter(([, blocks]) => blocks.length > 0)
    .map(([kind, blocks]) => (blocks.length > 1 ? `${blocks.length} ${kind}` : kind));

  return kinds.length ? `[ ${kinds.join(", ")} ]` : "";
}

function sheet(entry) {
  const node = stamp("sheet");
  const demo = demos[entry.slug];

  node.firstElementChild.id = entry.slug;
  slot(node, "number").textContent = pad(entry.number);
  slot(node, "title").innerHTML = entry.title;
  slot(node, "lede").innerHTML = entry.lede;
  slot(node, "specimen").replaceWith(demo ? specimen(entry, demo) : noSpecimen(entry));
  slot(node, "code-count").textContent = codeCount(entry.code);
  slot(node, "body").innerHTML = entry.body;

  return node;
}

/* The number comes after the title. Within a category the numbers do not run
   in order, so here one is a reference to look up and not a place in a row. */
function indexItem(entry) {
  const item = document.createElement("li");
  const link = document.createElement("a");
  const number = document.createElement("span");
  const title = document.createElement("span");

  link.href = `#${entry.slug}`;
  link.toggleAttribute("data-missing", !demos[entry.slug]);
  number.className = "index-number";
  number.textContent = pad(entry.number);
  title.className = "index-title";
  title.innerHTML = entry.title;
  link.title = title.textContent;
  link.append(title, number);
  item.append(link);

  return item;
}

function indexCategory(category) {
  const node = stamp("index-category");
  const title = slot(node, "title");

  title.href = `#${category.slug}`;
  title.textContent = category.title;
  slot(node, "entries").replaceChildren(...category.entries.map(indexItem));

  return node;
}

function category(category) {
  const node = stamp("category");

  node.firstElementChild.id = category.slug;
  slot(node, "title").textContent = category.title;
  slot(node, "count").textContent = `[ ${category.entries.length} entries ]`;
  slot(node, "sheets").replaceWith(...category.entries.map(sheet));

  return node;
}

const { entries, categories } = practices;
const drawn = entries.filter((entry) => demos[entry.slug]);

slot(document, "title").textContent = practices.title;
slot(document, "statement").innerHTML = practices.statement;
slot(document, "intro").innerHTML = practices.intro;
slot(document, "entry-count").textContent = `[ ${entries.length} ]`;
slot(document, "specimen-count").textContent = `[ ${drawn.length} / ${entries.length} ]`;
slot(document, "index").replaceChildren(...categories.map(indexCategory));
slot(document, "categories").replaceChildren(...categories.map(category));

for (const link of document.querySelectorAll('.prose a[href^="http"]')) link.target = "_blank";

/* The button copies the command beside it and says so for a moment. */
for (const button of document.querySelectorAll("[data-copy]")) {
  button.addEventListener("click", async () => {
    await navigator.clipboard.writeText(button.previousElementSibling.textContent);
    button.textContent = "Copied";
    setTimeout(() => (button.textContent = "Copy"), 1500);
  });
}
