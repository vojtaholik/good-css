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
   do alone: the two buttons, the phases, the count, the card it names, and a
   drag with a mouse. */
const carousel = slot(document, "cards");
const cards = [...carousel.children];
const [previous, next] = document.querySelectorAll("[data-carousel-dir]");
const phases = [...slot(document, "phases").querySelectorAll("button")];
const current = slot(document, "current");
const currentTitle = slot(document, "current-name");

/* One card is the current one, lit and named by the count. A button moves it
   by one card and a phase moves it to its own, so the count never skips. The
   row scrolls to bring that card to its start, and where the row can go no
   further, as with the last three of eight, the light moves along it. */
let index = 0;

const max = () => carousel.scrollWidth - carousel.clientWidth;
const start = (at) => cards[at].getBoundingClientRect().left - cards[0].getBoundingClientRect().left;
const stop = (at) => Math.min(start(at), max());

const draw = () => {
  previous.disabled = index === 0;
  next.disabled = index === cards.length - 1;
  current.textContent = pad(index + 1);
  currentTitle.textContent = slot(cards[index], "title").textContent;

  cards.forEach((card, at) => card.toggleAttribute("data-current", at === index));
  phases.forEach((button, at) => button.setAttribute("aria-pressed", at === index));
};

const go = (at) => {
  index = at;
  draw();
  carousel.scrollTo({ left: stop(index) });
};

/* A scroll by hand, once it comes to rest, makes the card it stopped at the
   current one. Of the last cards, which all stop at the end of the row, it
   keeps the one nearest the card that was current. */
let drag = null;
let resting;

const settle = () => {
  if (drag?.moving) return;

  carousel.removeAttribute("data-dragging");

  const off = (at) => Math.abs(stop(at) - carousel.scrollLeft);
  const nearest = Math.min(...cards.map((card, at) => off(at)));

  if (off(index) - nearest <= 1) return;

  index = cards
    .map((card, at) => at)
    .filter((at) => off(at) - nearest <= 1)
    .reduce((best, at) => (Math.abs(at - index) < Math.abs(best - index) ? at : best));
  draw();
};

const rest = () => {
  clearTimeout(resting);
  resting = setTimeout(settle, 120);
};

/* A mouse drags the row as a finger swipes it, as touch and a trackpad
   scroll it on their own and a mouse does not. The row does not snap while
   it is dragged, and on release it glides to the card the drag was headed
   for. A drag never opens the card it began on. */
carousel.addEventListener("pointerdown", (event) => {
  if (event.pointerType !== "mouse" || event.button !== 0) return;

  drag = { id: event.pointerId, x: event.clientX, from: carousel.scrollLeft, moving: false, moves: [] };
});

carousel.addEventListener("pointermove", (event) => {
  if (event.pointerId !== drag?.id) return;

  const distance = event.clientX - drag.x;

  if (!drag.moving) {
    if (Math.abs(distance) < 6) return;

    drag.moving = true;
    carousel.setPointerCapture(event.pointerId);
    carousel.setAttribute("data-dragging", "");
  }

  drag.moves = [...drag.moves, { x: event.clientX, time: event.timeStamp }].filter(
    (move) => event.timeStamp - move.time < 100,
  );
  carousel.scrollTo({ left: drag.from - distance, behavior: "instant" });
});

const release = (event) => {
  if (event.pointerId !== drag?.id) return;

  const { moving, moves } = drag;

  drag = null;

  if (!moving) return;

  /* The release aims as far past where the row is as the last tenth of a
     second of the drag was heading, and lands on the stop nearest that. A
     pointer held still before the release aims where the row is. */
  const recent = moves.filter((move) => event.timeStamp - move.time < 100);
  const [first, last] = [recent[0], recent.at(-1)];
  const speed = last && last.time > first.time ? (last.x - first.x) / (last.time - first.time) : 0;
  const aim = carousel.scrollLeft - speed * 200;
  const stops = cards.map((card, at) => stop(at));

  carousel.scrollTo({ left: stops.reduce((best, left) => (Math.abs(left - aim) < Math.abs(best - aim) ? left : best)) });
  rest();

  const swallow = (click) => {
    click.preventDefault();
    click.stopPropagation();
  };

  carousel.addEventListener("click", swallow, { capture: true });
  setTimeout(() => carousel.removeEventListener("click", swallow, { capture: true }));
};

carousel.addEventListener("pointerup", release);
carousel.addEventListener("pointercancel", release);
/* A link or a drawing would start a drag of its own. */
carousel.addEventListener("dragstart", (event) => event.preventDefault());

phases.forEach((button, at) => button.addEventListener("click", () => go(at)));
previous.addEventListener("click", () => go(Math.max(index - 1, 0)));
next.addEventListener("click", () => go(Math.min(index + 1, cards.length - 1)));
carousel.addEventListener("scroll", rest, { passive: true });

/* A new width keeps the current card where it was. */
new ResizeObserver(() => carousel.scrollTo({ left: stop(index), behavior: "instant" })).observe(carousel);

/* The built page already holds what draw draws for the first card, so only
   a page drawn just now needs it. */
if (empty) draw();
