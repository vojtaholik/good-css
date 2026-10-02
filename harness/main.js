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
  frame.title = `Specimen: ${entry.slug}`;
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

    size.textContent = `${Math.round(inlineSize)} × ${Math.round(blockSize)}`;
    for (const button of widths) button.setAttribute("aria-pressed", button.dataset.width === width);
  }).observe(frame);

  return node;
}

function noSpecimen(entry) {
  const node = stamp("no-specimen");
  slot(node, "file").textContent = `harness/demos/${entry.slug}.html`;
  return node;
}

function entry(entry) {
  const node = stamp("entry");
  const demo = demos[entry.slug];

  node.firstElementChild.id = entry.slug;
  slot(node, "title").innerHTML = entry.title;
  slot(node, "lede").innerHTML = entry.lede;
  slot(node, "specimen").replaceWith(demo ? specimen(entry, demo) : noSpecimen(entry));
  slot(node, "source").innerHTML = entry.source;
  slot(node, "notes").innerHTML = entry.notes;

  return node;
}

function category(category) {
  const node = stamp("category");

  node.firstElementChild.id = category.slug;
  slot(node, "title").textContent = category.title;
  slot(node, "entries").replaceChildren(...category.entries.map(entry));

  return node;
}

function card(category) {
  const node = stamp("card");

  node.querySelector("a").href = `#${category.slug}`;
  slot(node, "title").textContent = category.title;

  return node;
}

const { categories } = practices;

slot(document, "cards").replaceChildren(...categories.map(card));
slot(document, "total").textContent = pad(categories.length);
slot(document, "categories").replaceChildren(...categories.map(category));

for (const link of document.querySelectorAll('.prose a[href^="http"]')) link.target = "_blank";

/* The row of cards scrolls on its own. The script adds what a scroller cannot
   do alone: the two buttons, the count, and the bar that fills as it scrolls. */
const carousel = slot(document, "cards");
const [previous, next] = document.querySelectorAll("[data-carousel-dir]");
const current = slot(document, "current");
const progress = document.querySelector(".carousel-progress");

const step = (dir) => {
  const card = carousel.firstElementChild.getBoundingClientRect().width;
  carousel.scrollBy({ left: dir * card });
};

/* Every card can come to rest at the start of the row, so the scroll runs
   from the first card to the last and the count follows it. */
const sync = () => {
  const max = carousel.scrollWidth - carousel.clientWidth;
  const scrolled = max > 0 ? Math.min(Math.abs(carousel.scrollLeft) / max, 1) : 0;
  const position = scrolled * (categories.length - 1);

  previous.disabled = scrolled * max <= 1;
  next.disabled = max > 0 && scrolled * max >= max - 1;
  current.textContent = pad(Math.round(position) + 1);
  progress.style.setProperty("--progress", (position + 1) / categories.length);
};

previous.addEventListener("click", () => step(-1));
next.addEventListener("click", () => step(1));
carousel.addEventListener("scroll", sync, { passive: true });
new ResizeObserver(sync).observe(carousel);
sync();
