const slot = (root, name) => root.querySelector(`[data-slot="${name}"]`);

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

export function specimen(viewport) {
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
