import { readPractices } from "./practices.js";
import { demos } from "./demos/index.js";

const practices = readPractices();

/* The drawing of each category, named by the slug of its title. It goes into
   the page as markup, so its strokes take the color of the card. */
const drawings = import.meta.glob("./categories/*.svg", { query: "?raw", import: "default", eager: true });

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
  const grip = node.querySelector(".viewport-grip");

  frame.src = url;
  frame.title = `Specimen: ${entry.slug}`;
  viewport.style.setProperty("--frame-height", `${demo.height}px`);
  slot(node, "check").innerHTML = demo.check;
  slot(node, "open").href = url;

  /* A width button sets the width of the specimen, so the frame is wider by
     its two edges. The last button clears the width, and the frame fills its
     column again. */
  for (const button of widths) {
    button.addEventListener("click", () => {
      const width = Number(button.dataset.width);
      viewport.style.width = width ? `calc(${width}px + var(--edge) * 2)` : "";
    });
  }

  /* The pressed button is read off the frame, so dragging the corner clears it. */
  new ResizeObserver(([{ contentBoxSize }]) => {
    const [{ inlineSize, blockSize }] = contentBoxSize;
    const full = viewport.offsetWidth >= viewport.parentElement.clientWidth - 1;

    size.textContent = `${Math.round(inlineSize)} × ${Math.round(blockSize)}`;

    for (const button of widths) {
      const width = Number(button.dataset.width);
      button.setAttribute("aria-pressed", width ? !full && Math.round(inlineSize) === width : full);
    }
  }).observe(frame);

  const resize = (width, height) => {
    viewport.style.width = `${Math.max(width, 0)}px`;
    viewport.style.height = `${Math.max(height, 0)}px`;
  };

  /* The frame is centered in its column, so it grows and shrinks from its
     middle. A drag of the corner changes the width by twice the distance the
     pointer moves, and the corner stays under the pointer. The limits are the
     minimum and maximum sizes in the CSS. */
  grip.addEventListener("pointerdown", (down) => {
    const { width, height } = viewport.getBoundingClientRect();
    const towardEnd = getComputedStyle(viewport).direction === "rtl" ? -1 : 1;

    const move = (event) =>
      resize(width + (event.clientX - down.clientX) * 2 * towardEnd, height + event.clientY - down.clientY);

    const stop = () => {
      viewport.removeAttribute("data-resizing");
      grip.removeEventListener("pointermove", move);
    };

    down.preventDefault();
    grip.setPointerCapture(down.pointerId);
    viewport.setAttribute("data-resizing", "");
    grip.addEventListener("pointermove", move);
    grip.addEventListener("lostpointercapture", stop, { once: true });
  });

  /* The arrow keys do the same in steps, for a reader with no pointer. */
  grip.addEventListener("keydown", (event) => {
    const step = { ArrowLeft: [-32, 0], ArrowRight: [32, 0], ArrowUp: [0, -16], ArrowDown: [0, 16] }[event.key];

    if (!step) return;

    const { width, height } = viewport.getBoundingClientRect();

    event.preventDefault();
    resize(width + step[0], height + step[1]);
  });

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
  slot(node, "art").innerHTML = drawings[`./categories/${category.slug}.svg`] ?? "";
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
