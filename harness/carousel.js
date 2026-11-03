/* The row of cards scrolls on its own. The script adds what a scroller cannot
   do alone: the two buttons, the phases, the count, the card it names, and a
   drag with a mouse. */
const slot = (root, name) => root.querySelector(`[data-slot="${name}"]`);
const pad = (number) => String(number).padStart(2, "0");

/* Returns what draws the current card, which a page drawn just now needs. */
export function carousel(carousel) {
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

  return draw;
}
