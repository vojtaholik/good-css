/* What the index does in a browser. The page is drawn by draw.js. The built
   page arrives drawn, so draw.js is loaded only where the page is still
   empty: on the dev server, and in the build that draws it. */
const slot = (root, name) => root.querySelector(`[data-slot="${name}"]`);
const pad = (number) => String(number).padStart(2, "0");

const empty = !slot(document, "categories").childElementCount;

if (empty) await import("./draw.js");

/* The pressed button is read off the frame, so dragging the corner clears
   it. One observer watches every frame, and it reads every size before it
   writes one, so the page is laid out once for all of them. */
const frames = new ResizeObserver((entries) => {
  const sizes = entries.map(({ target, contentBoxSize: [{ inlineSize, blockSize }] }) => {
    const viewport = target.parentElement;
    const full = viewport.offsetWidth >= viewport.parentElement.clientWidth - 1;

    return { viewport, inlineSize, blockSize, full };
  });

  for (const { viewport, inlineSize, blockSize, full } of sizes) {
    slot(viewport, "size").textContent = `${Math.round(inlineSize)} × ${Math.round(blockSize)}`;

    for (const button of viewport.querySelectorAll("[data-width]")) {
      const width = Number(button.dataset.width);
      button.setAttribute("aria-pressed", width ? !full && Math.round(inlineSize) === width : full);
    }
  }
});

function specimen(viewport) {
  const widths = viewport.querySelectorAll("[data-width]");
  const grip = viewport.querySelector(".viewport-grip");

  /* A width button sets the width of the specimen. The last button clears
     the width, and the frame fills its column again. */
  for (const button of widths) {
    button.addEventListener("click", () => {
      const width = Number(button.dataset.width);
      viewport.style.width = width ? `${width}px` : "";
    });
  }

  frames.observe(slot(viewport, "frame"));

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
}

for (const viewport of document.querySelectorAll(".specimen .viewport")) specimen(viewport);

const menu = document.getElementById("category-menu");

/* A tap on a category in the list goes there and closes the list. */
menu.addEventListener("click", (event) => {
  if (event.target.closest("a")) menu.hidePopover();
});

/* The row of cards scrolls on its own. The script adds what a scroller cannot
   do alone: the two buttons, the phases, the count, and the card it names. */
const carousel = slot(document, "cards");
const cards = [...carousel.children];
const [previous, next] = document.querySelectorAll("[data-carousel-dir]");
const phases = [...slot(document, "phases").querySelectorAll("button")];
const current = slot(document, "current");
const currentTitle = slot(document, "current-name");

const max = () => carousel.scrollWidth - carousel.clientWidth;
const step = (dir) => carousel.scrollBy({ left: dir * carousel.firstElementChild.getBoundingClientRect().width });

/* The count runs from 01 to 08 as the row scrolls from start to end, and the
   card it names is lit. Where three cards show at once the row has six stops
   for the eight numbers, so a press of an arrow moves the count by one or by
   two. A phase scrolls to the place where the count names its card. */
const sync = () => {
  const scrolled = max() > 0 ? Math.min(Math.abs(carousel.scrollLeft) / max(), 1) : 0;
  const index = Math.round(scrolled * (cards.length - 1));

  previous.disabled = scrolled * max() <= 1;
  next.disabled = max() > 0 && scrolled * max() >= max() - 1;
  current.textContent = pad(index + 1);
  currentTitle.textContent = slot(cards[index], "title").textContent;

  cards.forEach((card, at) => card.toggleAttribute("data-current", at === index));
  phases.forEach((button, at) => button.setAttribute("aria-pressed", at === index));
};

phases.forEach((button, index) =>
  button.addEventListener("click", () => carousel.scrollTo({ left: (index / (cards.length - 1)) * max() })),
);
previous.addEventListener("click", () => step(-1));
next.addEventListener("click", () => step(1));
carousel.addEventListener("scroll", sync, { passive: true });
new ResizeObserver(sync).observe(carousel);

/* The observer calls sync once the row is laid out. The built page already
   holds what sync draws at the start of the row, so only a page drawn just
   now has it drawn at once, which would lay out the page early. */
if (empty) sync();
