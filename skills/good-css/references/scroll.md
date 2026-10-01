<!-- Generated from PRACTICES.md by scripts/build-skill.js. Do not edit. -->

## 9. Carousel on native scroll

Use it for any horizontal row of cards. The carousel is a real scroll container, so swipe, trackpad, keyboard and momentum all work before any script loads.

```css
.carousel {
  display: flex;
  gap: 1rem;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-padding-inline: 1.5rem;
  padding-inline: 1.5rem;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
}

.carousel > * {
  flex: none;
  scroll-snap-align: start;
}

@media (prefers-reduced-motion: no-preference) {
  .carousel { scroll-behavior: smooth; }
}
```

Arrow buttons are the one part that needs a script.

```html
<button data-carousel-dir="-1" aria-label="Previous">←</button>
<button data-carousel-dir="1" aria-label="Next">→</button>
```

```js
const carousel = document.querySelector(".carousel");
const [prev, next] = document.querySelectorAll("[data-carousel-dir]");

const step = (dir) => {
  const card = carousel.firstElementChild.getBoundingClientRect().width;
  carousel.scrollBy({ left: dir * card });
};

const sync = () => {
  const max = carousel.scrollWidth - carousel.clientWidth;
  prev.disabled = carousel.scrollLeft <= 1;
  next.disabled = carousel.scrollLeft >= max - 1;
};

prev.addEventListener("click", () => step(-1));
next.addEventListener("click", () => step(1));
carousel.addEventListener("scroll", sync, { passive: true });
sync();
```

Rules:

- Never move slides with `transform`, and never handle wheel or touch events yourself.
- Match `scroll-padding-inline` to `padding-inline` so a snapped card lines up with the page content.
- Chrome 135 can draw the arrows and dots in CSS with `::scroll-button()` and `::scroll-marker`. Firefox and Safari have neither, so use the script.

## 36. Styles that apply only when a scroller overflows

Use it on any row that may or may not fit, such as tabs, a toolbar or a table wrapper. It fades the edges only when there is something to scroll to. It replaces a `ResizeObserver` that compares `scrollWidth` with `clientWidth`.

```css
@keyframes overflowing {
  from, to { --fade: 2rem; }
}

.scroller {
  --fade: 0px;
  overflow-x: auto;
  animation: overflowing linear;
  animation-timeline: scroll(self inline);
  mask-image: linear-gradient(
    to right,
    transparent,
    #000 var(--fade),
    #000 calc(100% - var(--fade)),
    transparent
  );
}
```

To fade only the side that still has content, register the two lengths and give the keyframes different ends:

```css
@property --fade-start {
  syntax: "<length>";
  inherits: false;
  initial-value: 0px;
}

@property --fade-end {
  syntax: "<length>";
  inherits: false;
  initial-value: 0px;
}

@keyframes edges {
  from { --fade-start: 0px; --fade-end: 2rem; }
  10%, 90% { --fade-start: 2rem; --fade-end: 2rem; }
  to { --fade-start: 2rem; --fade-end: 0px; }
}

.scroller-edges {
  overflow-x: auto;
  animation: edges linear;
  animation-timeline: scroll(self inline);
  mask-image: linear-gradient(
    to right,
    transparent,
    #000 var(--fade-start),
    #000 calc(100% - var(--fade-end)),
    transparent
  );
}
```

Rules:

- Write `animation-timeline` after `animation`. The shorthand resets the timeline.
- Declare the default outside the keyframes, as `--fade: 0px` does here.
- Any value can go in the keyframes, including keywords. Stripe flips its navigation to `row-reverse` this way when a translation is too long to fit.
- Write no fallback. Firefox has no scroll timelines, so the row scrolls there without the fade.

Support: `animation-timeline` in Chrome 115 and Safari 26. Firefox has it in Nightly only.

## 24. Anchor targets that clear a sticky header

Use it on any page with in-page links and a fixed or sticky header.

```css
html { scroll-padding-block-start: 5rem; }

@media (prefers-reduced-motion: no-preference) {
  html { scroll-behavior: smooth; }
}
```

Rules:

- Keep the offset outside the motion query, so people who ask for reduced motion still get it.
- Tie the value to the header's height. Share one custom property between the two.

Support: Chrome 69, Firefox 68, Safari 14.1.

## 5. No rubber-band bounce on desktop

Use it on app-like pages with fixed UI, such as a sidebar or a sticky header. On macOS a trackpad scroll stretches the whole page past its edge and drags the fixed UI along.

```css
html { overscroll-behavior-y: none; }

@media (any-pointer: coarse) {
  html { overscroll-behavior-y: auto; }
}
```

Rules:

- Set it on `html`. The viewport takes its overscroll behavior from the root element.
- Use the `-y` longhand. `overscroll-behavior-x: none` also turns off swipe to go back.
- Give inner scroll containers, such as a sheet, a chat list or a sidebar, `overscroll-behavior: contain`. They keep their own bounce and stop the page behind them from moving. Never use a `touchmove` listener with `preventDefault()` for this.

## 32. Content clear of the notch

Use it on fixed headers, bottom bars, toasts and sheets in anything that should feel like an app on a phone. Add `viewport-fit=cover` to the viewport meta tag, then pad those elements by the safe-area insets.

```css
.app-header { padding-block-start: env(safe-area-inset-top, 0px); }

.bottom-bar { padding-block-end: env(safe-area-inset-bottom, 0px); }

.sheet { padding-block-end: calc(1rem + env(safe-area-inset-bottom, 0px)); }
```

Rules:

- Without `viewport-fit=cover` every inset is `0px` and the padding does nothing.
- Give `env()` a fallback of `0px` wherever it sits inside `calc()`.
- Normal page content needs none of this. The header's padding covers it.

Support: Chrome 69, Firefox 65, Safari 11.1.
