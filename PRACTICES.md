# good-css

Strong opinions about modern CSS technique, borrowed from experts, for agents to know and reach for.

Each one is described in plain CSS because that is the common language. None of them depends on a class name, a file layout or a framework: the properties and values are the technique. Write them in whatever the project already uses, whether that is a stylesheet, Tailwind utilities or StyleX objects. Names in the examples are illustrative.

The bias throughout: one declaration that adapts on its own beats a set of breakpoints, and a CSS feature beats a script. JavaScript appears only where it makes the result nicer, and the CSS works without it.

Every entry has the same shape: when to use it, the CSS, why it works, the rules, and who it is borrowed from.

## 1. Content grid with breakouts

Use it wherever you would reach for a centered max-width container. One grid on the section replaces the `section > .container` wrapper pair, and any child can be content width, wider, or edge to edge. Put it on `main` for a page of flowing content, or on each section. It suits CMS content well, because an editor widens a block with one class and no extra wrapper.

The container defines three nested widths with named grid lines:

```css
.content-grid {
  --gutter: 1.5rem;
  --content: 64rem;
  --breakout: 80rem;

  display: grid;
  grid-template-columns:
    [full-width-start] minmax(var(--gutter), 1fr)
    [breakout-start] minmax(0, calc((var(--breakout) - var(--content)) / 2))
    [content-start] min(100% - var(--gutter) * 2, var(--content)) [content-end]
    minmax(0, calc((var(--breakout) - var(--content)) / 2)) [breakout-end]
    minmax(var(--gutter), 1fr) [full-width-end];
}
```

Each child picks a width with `grid-column`. Content is the default:

```css
:is(.content-grid, .full-width) > * { grid-column: content; }
:is(.content-grid, .full-width) > .breakout { grid-column: breakout; }
:is(.content-grid, .full-width) > .full-width {
  grid-column: full-width;
  display: grid;
  grid-template-columns: inherit;
}
```

Why it works:

- Two lines named `content-start` and `content-end` create a named area, `content`. That is why `grid-column: content` works with no line numbers.
- `min(100% - 2 × gutter, max)` shrinks the content column on small screens with no media query.
- `minmax(0, …)` lets the breakout tracks collapse, so a breakout falls back to content width when there is no room. With a fixed breakout size the page overflows on small screens.
- `grid-template-columns: inherit` gives a full-width band the same grid, so content inside it lines up with the page column without another wrapper. This is Kevin Powell's addition. In Ryan Mulligan's original the full-width child is a plain box.

Rules:

- Every child must be placed. An unplaced child of the grid lands in the gutter track.
- Every direct child is a grid item. Wrap a run of inline elements in one element.
- Change a width by overriding `--content`, not by writing a new column template.

In other systems: the column template goes wherever the project defines reusable styles. Where child selectors are not available, as in StyleX or Tailwind without a custom variant, each child sets its own `grid-column` to `content`, `breakout` or `full-width`.

- Borrowed from: Kevin Powell, [A new approach to container and wrapper classes](https://www.youtube.com/watch?v=c13gpBrnGEw), 2023-11-09 · Ryan Mulligan, [Layout Breakouts with CSS Grid](https://ryanmulligan.dev/blog/layout-breakouts/) · Stephanie Eckles, [SmolCSS breakout grid](https://smolcss.dev/#smol-breakout-grid)
- Docs: [MDN: named grid lines](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout/Named_grid_lines) · [MDN: min()](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/min)

## 2. OKLCH color

Write colors in `oklch()` and derive every related color from a base with `color-mix(in oklch, …)`. Never hardcode a second hex or an `rgba()` for a hover, tint or transparent version.

```css
:root {
  --primary: oklch(55% 0.15 250);
  --primary-hover: color-mix(in oklch, var(--primary), black 15%);
  --primary-subtle: color-mix(in oklch, var(--primary) 12%, transparent);
}
```

Why it works:

- The three channels are lightness, chroma and hue. Lightness is perceptual, so two colors with the same L look equally light whatever their hue. Scales and contrast become predictable.
- Mixing in OKLCH keeps the hue of the base color, where sRGB mixing drifts toward gray.
- One base value drives the whole family. Change the base and the hover and subtle versions follow.

Rules:

- Write grays, white and black with `none` as the hue, as in `oklch(98% 0 none)`. A written hue of `0` is red, and it pulls every mix toward red. Half white `oklch(1 0 0)` and half a blue at hue 264 came out at hue 312 in Chrome and Safari. With `none`, or with the keyword `white`, it stayed at 264.

- Borrowed from: Andrey Sitnik and Travis Turner (Evil Martians), [OKLCH in CSS: why we moved from RGB and HSL](https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl) · Björn Ottosson, [A perceptual color space for image processing](https://bottosson.github.io/posts/oklab/)
- Docs: [MDN: oklch()](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/color_value/oklch) · [MDN: color-mix()](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/color_value/color-mix) · [oklch.com picker](https://oklch.com/)

## 3. Textarea that grows with its content

Use it for any multi-line input, such as a chat composer or a comment box. `field-sizing: content` sizes the textarea to its text, so there is no auto-grow script and no hidden mirror element.

```css
textarea {
  field-sizing: content;
  min-height: 3lh;
  max-height: 12lh;
  resize: none;
}
```

The height snaps to each new line. To animate it, wrap the textarea and let a `ResizeObserver` copy its height onto the wrapper. The wrapper transitions.

```html
<div class="field"><textarea></textarea></div>
```

```css
.field {
  box-sizing: content-box;
  overflow: clip;
}

@media (prefers-reduced-motion: no-preference) {
  .field { transition: height 0.2s var(--ease-out, ease-out); }
}
```

```js
const textarea = document.querySelector(".field textarea");

new ResizeObserver(([entry]) => {
  textarea.parentElement.style.height = `${entry.borderBoxSize[0].blockSize}px`;
}).observe(textarea);
```

Why it works:

- The browser measures the text itself, so the size is right on first paint, on paste and on window resize.
- The textarea reaches its final height at once. Only the wrapper animates, and it clips the textarea until it catches up.
- `lh` is one line at the element's own line-height. `min-height: 3lh` means three lines at any font size.

Rules:

- Bound it with `min-height` and `max-height`. A fixed `height` brings the fixed size back. Past `max-height` the textarea scrolls.
- Put the border and background on the wrapper and leave the textarea bare. The box the user sees must be the one that animates.
- Keep the wrapper `content-box`. The observer writes the textarea's full height, and a `border-box` wrapper would subtract its own border from it.
- Write no fallback. A browser without `field-sizing` shows a fixed textarea that scrolls.

Support: Chrome 123, Safari 26.2, Firefox 152. Baseline newly available since June 2026.

- Borrowed from: Jhey Tompkins, @jh3yy on X, 2026-10-01
- Docs: [MDN: field-sizing](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/field-sizing) · Adam Argyle, [CSS field-sizing](https://developer.chrome.com/docs/css-ui/css-field-sizing) · [MDN: ResizeObserver](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver)

## 4. Accordion that animates its height

Use it for FAQs and any other disclosure. `<details>` already gives you the toggle, keyboard support and find-in-page. These rules animate the open and the close with no JavaScript.

```css
:root { interpolate-size: allow-keywords; }

details::details-content {
  height: 0;
  overflow: clip;
}

details[open]::details-content { height: auto; }

@media (prefers-reduced-motion: no-preference) {
  details::details-content {
    transition:
      height 0.3s var(--ease-out, ease-out),
      content-visibility 0.3s allow-discrete;
  }
}
```

Why it works:

- `::details-content` is the box the browser wraps around everything in `<details>` except the `<summary>`.
- `interpolate-size: allow-keywords` lets a transition run between a length and `auto`. It inherits, so one declaration on `:root` covers the page.
- A closed `<details>` hides its content with `content-visibility`. Transitioning that property with `allow-discrete` keeps the content rendered until the height reaches zero. Leave it out and the close snaps.

Rules:

- Put padding on an element inside, never on `::details-content`. Padding there stays visible when the accordion is closed.
- Give sibling `<details>` the same `name` attribute to keep one open at a time.
- Hide the marker with `summary { list-style: none; }` plus `summary::-webkit-details-marker { display: none; }` for Safari.
- Write no fallback. Safari and Firefox do not support `interpolate-size` yet, so they open and close without the animation.

Support: `::details-content` in Chrome 131, Safari 18.4, Firefox 143. `interpolate-size` in Chrome 129 only.

- Borrowed from: Bramus Van Damme, [Animate to height: auto](https://developer.chrome.com/docs/css-ui/animate-to-height-auto)
- Docs: [MDN: ::details-content](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/::details-content) · [MDN: interpolate-size](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/interpolate-size) · [MDN: transition-behavior](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/transition-behavior)

## 5. No rubber-band bounce on desktop

Use it on app-like pages with fixed UI, such as a sidebar or a sticky header. On macOS a trackpad scroll stretches the whole page past its edge and drags the fixed UI along.

```css
html { overscroll-behavior-y: none; }

@media (any-pointer: coarse) {
  html { overscroll-behavior-y: auto; }
}
```

Why it works:

- `overscroll-behavior-y: none` on the root turns off the bounce.
- Touch devices get the default back, because pull to refresh depends on it.
- `any-pointer` checks every input, where `pointer` checks only the primary one. A device with a touchscreen plus a mouse or stylus keeps pull to refresh. Jhey's example is a foldable.

Rules:

- Set it on `html`. The viewport takes its overscroll behavior from the root element.
- Use the `-y` longhand. `overscroll-behavior-x: none` also turns off swipe to go back.
- Give inner scroll containers, such as a sheet, a chat list or a sidebar, `overscroll-behavior: contain`. They keep their own bounce and stop the page behind them from moving. Never use a `touchmove` listener with `preventDefault()` for this.

- Borrowed from: wits, @witsdev on X, 2026-09-30, describing how Vercel gates it behind `pointer: fine` · Jhey Tompkins, @jh3yy on X, for the `any-pointer` version · Emil Kowalski, [mobile-native skill](https://github.com/emilkowalski/skills/blob/main/skills/mobile-native/SKILL.md), for the inner containers
- Docs: [MDN: overscroll-behavior](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/overscroll-behavior) · [MDN: any-pointer](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/any-pointer)

## 6. The reset

Start every new project with it. In an existing project add one rule at a time and look at the result, because `min-width: 0` and the font rules change how things already render.

```css
*,
*::before,
*::after {
  box-sizing: border-box;
  min-width: 0;
}

:root {
  interpolate-size: allow-keywords;
  scrollbar-gutter: stable;
  text-wrap: pretty;
  font-synthesis: none;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-text-size-adjust: 100%;
  -webkit-tap-highlight-color: transparent;
}

body {
  margin: 0;
  min-height: 100svh;
}

h1, h2, h3, h4 { text-wrap: balance; }

img, svg, video {
  display: block;
  max-width: 100%;
  height: auto;
}

input, textarea, select { font-size: max(16px, 1rem); }

button, a, [role="button"] { touch-action: manipulation; }

button, [role="button"] {
  user-select: none;
  -webkit-user-select: none;
}
```

Why it works:

- `min-width: 0` lets flex and grid items shrink below their content. Their default is `min-width: auto`, which is why a long word or a wide child overflows a grid.
- `interpolate-size: allow-keywords` turns on transitions to and from `auto` for the whole page. Entry 4 depends on it.
- `text-wrap: pretty` tells the browser to spend more effort on line breaks. It avoids a last line that holds one short word, and Safari also evens out the ragged edge. The property inherits, so `:root` reaches every element.
- `text-wrap: balance` gives headings lines of similar length.
- `font-synthesis: none` stops the browser from faking a bold or italic that the font file lacks.
- The two smoothing rules switch macOS from subpixel to grayscale antialiasing. Text renders thinner and matches the weight shown in Figma. Other systems ignore them.
- `100svh` is the viewport height with the mobile browser toolbars showing, so the page never sits behind them. `100dvh` changes as the toolbar moves and re-lays out the page each time.
- `scrollbar-gutter: stable` reserves the scrollbar's space. The page does not shift sideways when a modal locks scrolling or when content grows past one screen.
- `-webkit-text-size-adjust: 100%` stops iOS from inflating text in landscape.
- `-webkit-tap-highlight-color: transparent` removes the gray flash iOS and Android paint over a tapped element.
- Inputs at 16px or more stop iOS Safari from zooming the page on focus. It does not zoom back out.
- `touch-action: manipulation` tells the browser the element never double-tap zooms, so `click` fires without the wait.
- `user-select: none` on controls stops a long press from selecting a button's label.

Rules:

- Load every weight and style the design uses. With `font-synthesis: none` a missing bold renders as regular.
- The reset removes the tap highlight, so every pressable element needs its own `:active` state. Entry 31 has it.
- Never fix input zoom with `user-scalable=no` or `maximum-scale=1`. That takes zoom away from people who need it.
- Keep `user-select: none` to controls. Never set it on `body` or on links, because people copy text.
- Text the user types inherits `pretty`, in `textarea` and `contenteditable`. If lines shift while typing, set `text-wrap: stable` on that element.
- The reserved gutter puts centered content slightly off-center on a page too short to scroll. Chris Coyier documents this. Accept it.
- `svh` is for documents and heroes. An app shell with UI pinned to the bottom uses `height: 100dvh`, so it tracks the toolbar. Emil Kowalski draws this line in his mobile-native skill.

Support: `text-wrap: pretty` in Chrome 117 and Safari 26, ignored by Firefox. `scrollbar-gutter` in Chrome 94, Firefox 97, Safari 18.2. `interpolate-size` in Chrome 129 only. The rest works everywhere.

- Borrowed from: Travis Arnold, @souporserious on X, 2025-04-02, "2025 CSS Reset" · Ayomidé Daniel, @aydahnizzy on X, 2025-10-10, for the font rules · `text-wrap: pretty` on everything is a house rule · Kevin Powell, [3 modern CSS properties to add to your reset](https://www.youtube.com/watch?v=qI5rXLJnxco), 2026-04-02, for `svh` and the gutter · Emil Kowalski, [mobile-native skill](https://github.com/emilkowalski/skills/blob/main/skills/mobile-native/SKILL.md), for the touch rules · Chris Coyier, [The Downsides of scrollbar-gutter: stable](https://blog.master.dev/the-downsides-of-scrollbar-gutter-stable-and-one-weird-trick/), 2025-12-03
- Background: Jen Simmons, [Better typography with text-wrap pretty](https://webkit.org/blog/16547/better-typography-with-text-wrap-pretty/) · Adam Argyle, [CSS text-wrap: pretty](https://developer.chrome.com/blog/css-text-wrap-pretty)
- Docs: [MDN: text-wrap](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/text-wrap) · [MDN: font-synthesis](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/font-synthesis) · [MDN: font-smooth](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/font-smooth)

## 7. Fluid sizes with `clamp()`

Use it for anything that should grow with the screen, starting with font sizes and section spacing. One declaration replaces a ladder of breakpoint overrides.

```css
:root {
  --text-body: clamp(1rem, 0.75rem + 1vw, 1.75rem);
  --space-section: clamp(3rem, 1rem + 6vw, 8rem);
}
```

Why it works:

- `clamp(min, preferred, max)` uses the preferred value and stops at the two bounds.
- The `vw` part of the preferred value grows with the viewport. The `rem` part sets where the growth starts.
- `--text-body` above is 16px up to a 400px viewport, 28px from 1600px, and a straight line between.

Rules:

- Write the preferred value as `rem + vw`, never `vw` alone. `clamp(1rem, 1vw, 1.75rem)` stays at 16px on every screen narrower than 1600px, because 1vw is smaller than 1rem until then. A bare `vw` value also ignores the reader's font size setting.
- Work the preferred value out from two points. The slope is `(max - min) / (wide - narrow)`, in px over px, and times 100 it is the `vw` number. The `rem` part is `min - slope × narrow`.
- Keep both bounds in `rem` so they follow the reader's font size.
- Put fluid values in tokens. Components use the token and never repeat the math.

- Borrowed from: Kyrylo Silin, @kyrylo on X, 2026-05-10 · James Gilyead and Trys Mudford, [Utopia](https://utopia.fyi/) · Adrian Roselli, [Responsive Type and Zoom](https://adrianroselli.com/2019/12/responsive-type-and-zoom.html)
- Docs: [MDN: clamp()](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/clamp) · Adrian Bece, [Modern Fluid Typography Using CSS Clamp](https://www.smashingmagazine.com/2022/01/modern-fluid-typography-css-clamp/)

## 8. One set of color tokens for light and dark

Use it on any site with a dark mode. Each token holds both values, so there is no second block of variables under a media query or a `.dark` class.

```css
:root {
  color-scheme: light dark;
  --background: light-dark(oklch(1 0 none), oklch(0.145 0 none));
  --foreground: light-dark(oklch(0.145 0 none), oklch(0.985 0 none));
}

[data-theme="light"] { color-scheme: light; }
[data-theme="dark"] { color-scheme: dark; }
```

Why it works:

- `color-scheme: light dark` says the page supports both and follows the system setting. It also switches the browser's own UI, such as form controls, scrollbars and the default page background.
- `light-dark(a, b)` returns `a` in a light scheme and `b` in a dark one.
- It resolves per element. Set `color-scheme` on any subtree and every token used inside it flips. The same tokens serve a manual toggle and a section that is always dark.

Rules:

- Switch themes by setting `color-scheme`. Never redefine the tokens.
- The grays use `none` for the hue, so they can be mixed with a color later without drifting toward red. Entry 2 has the measurement.
- `light-dark()` takes two colors. Anything else that differs by theme, such as an image, needs its own rule.
- Add `<meta name="color-scheme" content="light dark">` so the browser paints the right background before the CSS loads.

Support: Chrome 123, Firefox 120, Safari 17.5. Baseline since May 2024.

- Borrowed from: IP, @ipwanciu on X, 2025-10-30
- Docs: [MDN: light-dark()](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/color_value/light-dark) · [MDN: color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/color-scheme) · Bramus Van Damme, [CSS color-scheme-dependent colors with light-dark()](https://web.dev/articles/light-dark)

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

Why it works:

- Scroll snap makes the browser do the scrolling and the landing. Every input method gets the same result.
- `scrollBy` moves one card width and snapping picks the final position. The script never calculates an offset.
- `scroll-behavior: smooth` in CSS animates the script's scroll. The media query turns the animation off for people who ask for reduced motion.
- `overscroll-behavior-x: contain` stops a swipe at the end of the row from triggering the browser's back gesture.

Rules:

- Never move slides with `transform`, and never handle wheel or touch events yourself.
- Match `scroll-padding-inline` to `padding-inline` so a snapped card lines up with the page content.
- Chrome 135 can draw the arrows and dots in CSS with `::scroll-button()` and `::scroll-marker`. Firefox and Safari have neither, so use the script.

- Borrowed from: Steve Sewell, [Build buttery smooth carousels with pure CSS like Nike](https://www.builder.io/blog/css-carousel). This version swaps his `scrollIntoView()` for `scrollBy()`, which can only scroll the carousel and never the page.
- Docs: Adam Argyle, [Carousels with CSS](https://developer.chrome.com/blog/carousels-with-css) · [MDN: scroll snap](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll_snap) · [MDN: scrollBy()](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollBy)

## 10. Stack layers with grid

Use it whenever things sit on top of each other, such as text over an image, a badge on a card, or two icons that swap. It replaces `position: absolute` with its offsets, sizes and transforms.

```css
.stack { display: grid; }
.stack > * { grid-area: 1 / 1; }

.stack > .title { place-self: center; }
.stack > .badge { place-self: start end; }
```

Why it works:

- Every child goes into the same grid cell, so they overlap.
- The layers stay in flow. The container takes the size of its largest layer, where an absolutely positioned child adds nothing to it.
- `place-self` aligns one layer inside the cell. Without it the layer stretches to fill.

Rules:

- A layer later in the DOM paints on top. Use `z-index` only to change that order.
- Keep `position: absolute` for a layer that must not affect the container's size.

- Borrowed from: Ana Tudor, @anatudor on X, 2025-03-29
- Docs: [MDN: grid-area](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/grid-area) · [MDN: place-self](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/place-self)

## 11. Intrinsic grid

Use it for any set of equal cards or tiles. It replaces a column count per breakpoint.

```css
.grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
}
```

Why it works:

- `auto-fit` creates as many 16rem columns as the row holds, and `1fr` shares what is left. The column count follows the container.
- `min(100%, 16rem)` lets the minimum shrink to the container. Without it a 200px container overflows.

Rules:

- `auto-fit` stretches a short row to fill the width. Use `auto-fill` when the item count changes, such as a filtered list, so cards keep their size.

Support: Chrome 79, Firefox 76, Safari 11.1.

- Borrowed from: Kevin Powell, [Breakpoint-Free CSS Grid Layouts](https://www.youtube.com/watch?v=bj0Z_GncIwY), 2025-02-19 · Stephanie Eckles, [Smol Responsive CSS Grid](https://smolcss.dev/#smol-css-grid) · Una Kravets, [Ten modern layouts in one line of CSS](https://web.dev/articles/one-line-layouts)

## 12. Container queries with container units

Use it for any component that appears in slots of different widths. The component responds to the space it is given, where a media query only knows the viewport.

```css
.slot { container-type: inline-size; }

.card h2 { font-size: clamp(1.25rem, 1rem + 2cqi, 2rem); }

@container (width > 30rem) {
  .card {
    display: grid;
    grid-template-columns: 12rem 1fr;
  }
}
```

Why it works:

- The query measures the nearest container, so the same card is right in a sidebar and in a wide column.
- `1cqi` is 1% of that container's inline size. The `clamp()` math from entry 7 carries over, per component.

Rules:

- The container must be an ancestor. An element cannot query itself.
- A container cannot take its width from its content. Never put `container-type` on a shrink-to-fit element, or it collapses to zero.
- With no container ancestor the query never matches. Kevin Powell makes `header`, `main` and `footer` containers in his reset, so most components need none of their own.
- A container cannot also be a subgrid. Entry 13 and this one need separate elements.

Support: Chrome 105, Firefox 110, Safari 16.

- Borrowed from: Kevin Powell, [Improve your reset with these modern CSS additions](https://www.youtube.com/watch?v=eWmDW4zEXt4), 2024-09-04 · Una Kravets, [Container queries land in stable browsers](https://web.dev/blog/cq-stable), 2023-02-14 · Josh W. Comeau, [A Friendly Introduction to Container Queries](https://www.joshwcomeau.com/css/container-queries-introduction/), 2024-11-04 · Stephanie Eckles, [Container Query Units and Fluid Typography](https://moderncss.dev/container-query-units-and-fluid-typography/)

## 13. Subgrid rows shared across cards

Use it when cards in a row have parts that should line up, such as title, body and footer, whatever the length of their content.

```css
.cards {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
}

.card {
  display: grid;
  grid-row: span 3;
  grid-template-rows: subgrid;
  row-gap: 0.5rem;
}
```

Why it works:

- Each card spans three rows of the parent grid and adopts those tracks. The tallest title in a row sets the title height for every card in that row.

Rules:

- The span must equal the number of parts in the card. Without `grid-row: span N` every part piles into one row.
- Set `row-gap` on the card, or it inherits the parent's gap between its parts.

Support: Chrome 117, Firefox 71, Safari 16.

- Borrowed from: Josh W. Comeau, [Brand New Layouts with CSS Subgrid](https://www.joshwcomeau.com/css/subgrid/), 2025-11-25 · Kevin Powell, [Subgrid & Container Queries change how we can create layouts](https://www.youtube.com/watch?v=Zddz_R1RnfM), 2023-10-26

## 14. Sidebar that wraps on its own

Use it for any pair where one side has an ideal width and the other takes the rest, such as a media object, an input with a button, or a page with an aside.

```css
.with-sidebar {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.sidebar {
  flex-basis: 20rem;
  flex-grow: 1;
}

.main {
  flex-basis: 0;
  flex-grow: 999;
  min-inline-size: 50%;
}
```

Why it works:

- The main side's huge `flex-grow` takes all the free space, which holds the sidebar at its basis.
- Once the main side would get less than half the container it wraps below, and both sides grow to full width.

Rules:

- The wrap point is a share of the container, not a length. Change `min-inline-size` to move it.
- Drop the sidebar's `flex-basis` for a sidebar sized by its content.

Support: Chrome 84, Firefox 63, Safari 14.1.

- Borrowed from: Heydon Pickering and Andy Bell, [The Sidebar](https://every-layout.dev/layouts/sidebar/), Every Layout

## 15. Safe alignment

Use it wherever content is centered or end-aligned in a container that can become too small, such as a tab row, a toolbar or a vertically centered modal.

```css
.tabs {
  display: flex;
  overflow-x: auto;
  justify-content: safe center;
}
```

Why it works:

- Plain `center` pushes overflow off the start edge, where scrolling cannot reach it. `safe` falls back to `start` once the content overflows.

Rules:

- It works on every `align-*`, `justify-*` and `place-*` property.

Support: Chrome 115, Firefox 63, Safari 17.6.

- Borrowed from: Temani Afif, [Safe align your content](https://css-tip.com/safe-align/), 2025-06-10

## 16. Logical properties

Use them in place of every left, right, top and bottom, in spacing, borders, offsets and alignment.

```css
.card {
  position: relative;
  padding-inline: 1.5rem;
  margin-block-end: 2rem;
  border-inline-start: 4px solid;
  text-align: start;
}

.card .close {
  position: absolute;
  inset-block-start: 1rem;
  inset-inline-end: 1rem;
}
```

Why it works:

- `inline` is the direction text runs and `block` the direction blocks stack. Start and end follow `dir` and `writing-mode`, so one set of declarations renders mirrored in a right-to-left page.

Rules:

- The four-value `margin`, `padding` and `inset` shorthands stay physical. Use the `-inline` and `-block` shorthands.

Support: Chrome 87, Firefox 66, Safari 14.1.

- Borrowed from: Ahmad Shadeed, [Digging Into CSS Logical Properties](https://ishadeed.com/article/css-logical-properties/), 2021-03-10

## 17. `overflow: clip` over `hidden`

Use it whenever you want to cut off overflow and do not need scrolling.

```css
.hero { overflow-x: clip; }
```

Why it works:

- `hidden` turns the element into a scroll container and sets the other axis to `auto`. That causes stray scrollbars and breaks `position: sticky` inside it.
- `clip` cuts the overflow and does neither.

Rules:

- Put it on the element that overflows, not on `html` or `body`.
- Keep `hidden` or `auto` for elements a script scrolls. `clip` blocks that too.

Support: Chrome 90, Firefox 81, Safari 16.

- Borrowed from: Kevin Powell, [2 better alternatives to overflow: hidden](https://www.youtube.com/watch?v=72pUm4tQesw), 2023-12-14

## 18. `:has()` for parent and page state

Use it wherever a script adds a class to a parent because of what it contains or what state a child is in.

```css
article:has(img) { grid-column: span 2; }
h2:has(+ p) { margin-block-end: 0; }
form:has(:focus-visible) { background: var(--surface-raised); }

html { scrollbar-gutter: stable; }
html:has(dialog:modal) { overflow: hidden; }
```

Why it works:

- `:has()` matches an element by its descendants or following siblings, and it accepts state pseudo-classes. Content and form state can style any ancestor.
- On the root it works as a page-wide listener. The last rule locks page scroll while a modal dialog is open and lifts the lock when it closes, with nothing to clean up.

Rules:

- `:modal` matches `showModal()` only, so a non-modal dialog does not lock the page.
- Keep `scrollbar-gutter: stable` with the scroll lock. Without it the page shifts sideways when the scrollbar disappears. Entry 6 sets it in the reset.
- `:has()` cannot be nested inside `:has()`.

Support: Chrome 105, Firefox 121, Safari 15.4.

- Borrowed from: Jen Simmons, [Using :has() as a CSS Parent Selector and much more](https://webkit.org/blog/13096/css-has-pseudo-class/), 2022-08-18 · Josh W. Comeau, [The Undeniable Utility Of CSS :has](https://www.joshwcomeau.com/css/has/), 2024-09-09 · Chris Coyier, [Scroll-Locked Dialogs](https://blog.master.dev/scroll-locked-dialogs/), 2024-02-19

## 19. Form feedback with `:user-invalid`

Use it for inline form validation, in place of blur listeners and a "touched" class.

```css
input:user-invalid { border-color: var(--danger); }
input:user-valid { border-color: var(--success); }
```

```html
<input type="password" required minlength="8">
```

Why it works:

- `:invalid` matches an empty required field on page load. The `:user-` versions match only after the user has edited the field or tried to submit.
- Validity comes from HTML attributes: `required`, `minlength`, `type`, `pattern`.

Rules:

- Color alone is not enough feedback. Pair it with text or an icon.
- The server still validates.

Support: Chrome 119, Firefox 88, Safari 16.5.

- Borrowed from: Kevin Powell, [Improve forms with :user-valid and :user-invalid](https://www.youtube.com/watch?v=NmSifR3dS7o), 2025-02-20, and [Use these CSS features instead of JavaScript](https://www.youtube.com/watch?v=qu1jE41O_8o), 2026-09-23

## 20. One focus ring with `:focus-visible`

Use it as the focus style for every interactive element. Never write `outline: none`.

```css
:focus-visible {
  outline: max(2px, 0.08em) solid currentColor;
  outline-offset: 0.25em;
}
```

Why it works:

- The browser decides when a ring helps. Keyboard focus gets one, a mouse click on a button does not, and text inputs always do.
- `currentColor` and `em` make the ring follow each component's color and size.
- `outline` takes no layout space and survives forced-colors mode, which removes `box-shadow`.

Rules:

- On a filled button `currentColor` can fail contrast. Set the outline to the button's background color there.
- A component that draws its ring with `box-shadow` keeps `outline-color: transparent`, never `outline: none`, so forced-colors mode can repaint it.

Support: Chrome 86, Firefox 85, Safari 15.4.

- Borrowed from: Stephanie Eckles, [Modern CSS Upgrades To Improve Accessibility](https://moderncss.dev/modern-css-upgrades-to-improve-accessibility/), 2021-04-09, and [Smol Focus Styles](https://smolcss.dev/#smol-focus-styles) · Kevin Powell, [3 super small changes to improve your CSS](https://www.youtube.com/watch?v=zT9Ftmw0-uc), 2023-03-07

## 21. Hover styles only where hover exists

Use it on every `:hover` rule, so a tap on a touch screen does not leave the hover state stuck.

```css
@media (hover: hover) and (pointer: fine) {
  .button:hover { background: var(--primary-hover); }
}
```

Why it works:

- Touch browsers apply `:hover` on tap and keep it until the next tap elsewhere. `hover: hover` asks whether the primary input can hover.
- `pointer: fine` asks whether it is precise, like a mouse. It rules out styluses and the Android devices that claim hover support.

Rules:

- Tailwind v4's `hover:` variant wraps itself in `(hover: hover)` only. Write the full query by hand everywhere else.
- Touch users still need feedback on press. Give it with `:active`, which works for every input.

Support: Chrome 38, Firefox 64, Safari 9.

- Borrowed from: Emil Kowalski, [mobile-native skill](https://github.com/emilkowalski/skills/blob/main/skills/mobile-native/SKILL.md) and [emil-design-eng skill](https://github.com/emilkowalski/skills/blob/main/skills/emil-design-eng/SKILL.md) · Rauno Freiberg, [Web Interface Guidelines](https://interfaces.rauno.me/)

## 22. Opt-in motion

Use it for every transition or animation that moves or scales something.

```css
.box:hover { transform: scale(1.2); }

@media (prefers-reduced-motion: no-preference) {
  .box { transition: transform 300ms; }
}
```

Why it works:

- Motion exists only inside the query, so the default is none. People who never touched the setting match `no-preference` and see it.

Rules:

- Build the state change first and add the motion inside the query. Do not strip motion afterwards with a global rule that sets every duration to `0.01ms`.
- Fades of opacity and color are not motion and can stay outside the query.
- Animation driven by a script checks the same query with `matchMedia`.

Support: Chrome 74, Firefox 63, Safari 10.1.

- Borrowed from: Josh W. Comeau, [Accessible Animations in React with "prefers-reduced-motion"](https://www.joshwcomeau.com/react/prefers-reduced-motion/) · Kevin Powell, [3 super small changes to improve your CSS](https://www.youtube.com/watch?v=zT9Ftmw0-uc), 2023-03-07

## 23. Enter and exit transitions from `display: none`

Use it for dialogs, popovers and anything else toggled with `display`. It replaces a script that adds classes and waits for `transitionend`.

```css
dialog,
[popover] {
  opacity: 0;
  transition:
    opacity 0.2s var(--ease-out, ease-out),
    translate 0.2s var(--ease-out, ease-out),
    display 0.2s allow-discrete,
    overlay 0.2s allow-discrete;
}

dialog::backdrop {
  opacity: 0;
  transition:
    opacity 0.2s var(--ease-out, ease-out),
    display 0.2s allow-discrete,
    overlay 0.2s allow-discrete;
}

dialog[open],
[popover]:popover-open,
dialog[open]::backdrop { opacity: 1; }

@starting-style {
  dialog[open],
  [popover]:popover-open,
  dialog[open]::backdrop { opacity: 0; }
}

@media (prefers-reduced-motion: no-preference) {
  dialog,
  [popover] { translate: 0 0.5rem; }

  dialog[open],
  [popover]:popover-open { translate: 0 0; }

  @starting-style {
    dialog[open],
    [popover]:popover-open { translate: 0 0.5rem; }
  }
}
```

Why it works:

- `@starting-style` gives the browser a "before open" state to transition from when the element leaves `display: none`. That is the entry.
- `allow-discrete` on `display` delays the switch to `display: none` until the other transitions finish. That is the exit. `overlay` keeps the element in the top layer meanwhile.
- The fade is not motion, so it runs for everyone. Only the slide sits inside the reduced-motion query.

Rules:

- Put `@starting-style` after the open-state rule. It has no extra weight in the cascade.
- Never start from `scale(0)`. If the element scales in, start at `scale(0.95)` with `opacity: 0`.
- The dialog's `::backdrop` needs the same three states and its own transition, as in the block. Without them it snaps while the dialog fades.
- Write no fallback. Where the exit is not supported the element closes at once.

Support: both directions in Chrome 117. In Safari 27 the entry animates and `<dialog>` and popovers close at once, tested in real Safari on 2026-10-01. An element toggled with a class animates both ways there. Firefox 129 animates the entry only.

- Borrowed from: Una Kravets and Joey Arhar, [Four new CSS features for smooth entry and exit animations](https://developer.chrome.com/blog/entry-exit-animations) · Kevin Powell, [Transition to and from display: none](https://www.youtube.com/watch?v=KD3_l3S_D6M), 2026-07-22 · Chris Coyier, [In-N-Out Animations: Dialogs](https://blog.master.dev/in-n-out-animations-dialogs-part-1-3/), 2026-06-01 · Adam Argyle, [Steal this popover code](https://nerdy.dev/steal-this-popover-starter-kit), 2024-03-15

## 24. Anchor targets that clear a sticky header

Use it on any page with in-page links and a fixed or sticky header.

```css
html { scroll-padding-top: 5rem; }

@media (prefers-reduced-motion: no-preference) {
  html { scroll-behavior: smooth; }
}
```

Why it works:

- The browser offsets every scroll to an anchor by the padding, so the target lands below the header. No script calculates offsets.

Rules:

- Keep the offset outside the motion query, so people who ask for reduced motion still get it.
- Tie the value to the header's height. Share one custom property between the two.

Support: Chrome 69, Firefox 68, Safari 14.1.

- Borrowed from: Kevin Powell, [Stop fixed navigations covering content on scroll](https://www.youtube.com/watch?v=iGUSTyG-CYw), 2022-06-02, and [Use these CSS features instead of JavaScript](https://www.youtube.com/watch?v=qu1jE41O_8o), 2026-09-23

## 25. Cross-document view transitions

Use it on any multi-page site to crossfade between pages. It replaces a client-side router or a page-transition script.

```css
@view-transition { navigation: auto; }
```

Why it works:

- On a same-origin navigation the browser snapshots the old and new page and crossfades them. Parts that do not change, such as the header, appear to stay in place.

Rules:

- Both pages must include the rule.
- The default crossfade adds no movement and needs no reduced-motion guard. If you add slides, put the rule inside `@media (prefers-reduced-motion: no-preference)`.

Support: Chrome 126, Safari 18.2. Firefox navigates as normal.

- Borrowed from: Jen Simmons and James Craig, [Two lines of Cross-Document View Transitions code you can use on every website today](https://webkit.org/blog/16967/two-lines-of-cross-document-view-transitions-code-you-can-use-on-every-website-today/), 2025-05-21 · Bramus Van Damme, [Cross-document view transitions for multi-page applications](https://developer.chrome.com/docs/web-platform/view-transitions/cross-document)

## 26. Popover anchored to its trigger

Use it for dropdown menus and other popovers opened by a click. It replaces a positioning library or a script that reads `getBoundingClientRect()`.

```html
<button popovertarget="menu">Options</button>
<div id="menu" popover>
  <button>Rename</button>
  <button>Delete</button>
</div>
```

```css
@supports (position-area: block-end) {
  [popover] {
    margin: 0;
    margin-block-start: 0.5rem;
    position-area: block-end span-inline-end;
    position-try-fallbacks: flip-block, flip-inline, flip-block flip-inline;
  }
}
```

Why it works:

- `popovertarget` makes the button the popover's anchor, so no anchor names are needed.
- `position-area` places the popover on a 3×3 grid around the anchor. The fallbacks flip it when it would overflow the viewport.

Rules:

- Use `span-*` values, not `center`. Adam Argyle found that `center` stops the flips when the popover is wider than its grid cell.
- `margin-block-start` is the gap between trigger and popover. The flip mirrors it, so the gap stays on the trigger's side.
- A popover opened by a script has no anchor and lands in the top-left corner. Pass the trigger, as in `menu.showPopover({ source: button })`.
- Write no fallback. Without support the `@supports` block is skipped and the popover opens centered in the viewport.

Support: Chrome 133, Firefox 147, Safari 26.

- Borrowed from: Una Kravets, [Introducing the CSS anchor positioning API](https://developer.chrome.com/blog/anchor-positioning-api), 2024-05-10 · Saron Yitbarek, [A gentle introduction to anchor positioning](https://webkit.org/blog/17240/a-gentle-introduction-to-anchor-positioning/), 2025-08-12 · Adam Argyle, [Why isn't my position-try-fallback working in small spaces?](https://nerdy.dev/why-isnt-my-position-try-fallback-working-in-small-spaces), 2024-10-12

## 27. Hit area larger than the visual

Use it on icon buttons, close buttons and any target that looks smaller than 44px.

```css
.icon-button { position: relative; }

.icon-button::after {
  content: "";
  position: absolute;
  inset: min(0px, (100% - 44px) / 2);
}
```

Why it works:

- The pseudo-element belongs to the button, so a click on it hits the button.
- The negative inset grows the area to exactly 44px. `min(0px, …)` leaves larger targets alone.

Rules:

- `overflow: hidden` or `clip` on the button cuts the area off.
- It does not work on `<input>`, which has no pseudo-elements. Wrap it in a `<label>`.

Support: Chrome 87, Firefox 66, Safari 14.1.

- Borrowed from: Emil Kowalski, [Agents with Taste](https://emilkowal.ski/ui/agents-with-taste), for the rule · [Vercel Web Interface Guidelines](https://vercel.com/design/guidelines). The `inset` formula was written for this list.

## 28. Tabular numbers

Use it on any number that changes or sits in a column, such as prices, tables, timers and counters.

```css
.price,
td,
time { font-variant-numeric: tabular-nums; }
```

Why it works:

- Every digit gets the same width, so columns line up and a ticking value does not shift its neighbors.

Rules:

- Do not set it globally. Proportional digits read better in prose.
- The font must ship tabular figures, or nothing changes.

Support: Chrome 52, Firefox 34, Safari 9.1.

- Borrowed from: Rauno Freiberg, [Web Interface Guidelines](https://interfaces.rauno.me/) · [Vercel Web Interface Guidelines](https://vercel.com/design/guidelines)

## 29. Concentric nested radius

Use it wherever a rounded element sits inside a padded rounded parent, such as an image in a card or a button in an input.

```css
.card {
  --radius: 0.75rem;
  --pad: 0.5rem;
  padding: var(--pad);
  border-radius: calc(var(--radius) + var(--pad));
}

.card > * { border-radius: var(--radius); }
```

Why it works:

- Two curves look parallel only when they share a center. That means outer radius = inner radius + gap. Equal radii make the corner band look pinched.

Rules:

- Derive the outer radius from the inner one. The other way round reaches zero once the padding exceeds the radius.

Support: every browser.

- Borrowed from: Chris Coyier, [The Classic Border Radius Advice, Plus an Unusual Trick](https://blog.master.dev/the-classic-border-radius-advice-plus-an-unusual-trick/), 2024-05-13, which quotes Jhey Tompkins's version

## 30. Motion tokens

Use them in every transition and animation. Two easing curves, defined once, and a rule for durations.

```css
:root {
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
}

.dropdown { transition: opacity 180ms var(--ease-out); }
```

Why it works:

- An ease-out curve starts fast, so the interface moves at the moment the user is watching. Use `--ease-out` for anything entering or leaving.
- An ease-in-out curve suits something that is already on screen and moves to a new place. Use `--ease-in-out` there.
- The built-in `ease-out` and `ease-in-out` keywords are weak versions of the same shapes. These two are stronger.

Rules:

- Never use `ease-in` on UI. It starts slow and reads as lag.
- Keep UI transitions under 300ms. Press feedback takes 100 to 160ms, tooltips and small popovers 125 to 200ms, dropdowns 150 to 250ms, modals and drawers 200 to 500ms.
- Name the properties in a transition. Never write `transition: all`.
- Other entries write `var(--ease-out, ease-out)`, so their snippets work before these tokens exist.
- Whether something should animate at all is not a CSS question. Emil Kowalski's `animate` and `review-animations` skills answer it.

Support: every browser.

- Borrowed from: Emil Kowalski, [emil-design-eng skill](https://github.com/emilkowalski/skills/blob/main/skills/emil-design-eng/SKILL.md) and [7 Practical Animation Tips](https://emilkowal.ski/ui/7-practical-animation-tips)

## 31. Press feedback

Use it on every button and anything else that can be pressed.

```css
.button:active { transform: scale(0.97); }

@media (prefers-reduced-motion: no-preference) {
  .button { transition: transform 160ms var(--ease-out, ease-out); }
}
```

Why it works:

- A native button responds the instant a finger lands. `:active` does the same on every kind of input. Feedback that waits for `click` arrives when the finger leaves, and that reads as lag.
- `scale()` shrinks the label and icon along with the button, so the whole control reads as pressed.

Rules:

- Keep the scale between 0.95 and 0.98.
- The reset in entry 6 removes the browser's tap highlight. Without this entry a tap gives no feedback at all.
- When feedback needs a script, listen for `pointerdown`, not `click`.

Support: every browser.

- Borrowed from: Emil Kowalski, [emil-design-eng skill](https://github.com/emilkowalski/skills/blob/main/skills/emil-design-eng/SKILL.md) and [mobile-native skill](https://github.com/emilkowalski/skills/blob/main/skills/mobile-native/SKILL.md)

## 32. Content clear of the notch

Use it on fixed headers, bottom bars, toasts and sheets in anything that should feel like an app on a phone. Add `viewport-fit=cover` to the viewport meta tag, then pad those elements by the safe-area insets.

```css
.app-header { padding-block-start: env(safe-area-inset-top, 0px); }

.bottom-bar { padding-block-end: env(safe-area-inset-bottom, 0px); }

.sheet { padding-block-end: calc(1rem + env(safe-area-inset-bottom, 0px)); }
```

Why it works:

- By default the browser keeps the page inside the safe area and leaves the notch and home-indicator zones as bare background. `viewport-fit=cover` lets the page paint edge to edge.
- `env(safe-area-inset-*)` gives the size of each zone, so the content moves clear while the background still fills the screen.

Rules:

- Without `viewport-fit=cover` every inset is `0px` and the padding does nothing.
- Give `env()` a fallback of `0px` wherever it sits inside `calc()`.
- Normal page content needs none of this. The header's padding covers it.

Support: Chrome 69, Firefox 65, Safari 11.1.

- Borrowed from: Emil Kowalski, [mobile-native skill](https://github.com/emilkowalski/skills/blob/main/skills/mobile-native/SKILL.md)

## 33. Label centered on its letters with `text-box`

Use it on single-line labels in buttons, badges and chips, so equal padding looks equal in any font.

```css
.button {
  display: inline-block;
  padding: 0.75rem 1.25rem;
  text-box: trim-both cap alphabetic;
}

.button-with-icon {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
}

.button-with-icon > span { text-box: trim-both cap alphabetic; }
```

Why it works:

- A line of text reserves space above the capitals and below the baseline, and the two amounts differ from font to font. Equal padding around that line puts the letters off-center.
- `trim-both cap alphabetic` cuts the box down to the cap height and the baseline. The padding then starts at the letters.
- A font swap or a fallback font no longer moves the label.

Rules:

- It does nothing on a flex or grid container. A button that is `inline-flex` because it holds an icon needs the declaration on the element that wraps the text, as in the second rule of the block.
- The button gets shorter, because the padding now starts at the letters. With `0.75rem` of padding it went from 48px tall to 35px in Chrome and Safari. Raise the padding to keep the height.
- Use it for one line. Descenders hang into the bottom padding, which is the intent.
- Scope it to labels. Never set it on `*`, because it shrinks every text block. A one-line paragraph at 16px/1.5 went from 25px tall to 11px.
- Write no fallback. Without support the label keeps its normal line box.

Support: Chrome 133, Firefox 154, Safari 18.2.

- Borrowed from: Stripe, which ships it on its buttons at stripe.com. There the button is a flex container, so the declaration has no effect and uneven padding does the centering. The first rule above is the fix.
- Docs: [MDN: text-box](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/text-box)

## 34. Section spacing that depends on its neighbors

Use it on any page built from reorderable sections, above all in a CMS where an editor decides the order. When two particular sections meet, the spacing between them changes on its own.

```css
section { padding-block: 6rem; }

.logos:has(+ .features) { padding-block-end: 2rem; }
.features:has(+ .cta) { padding-block-end: 0; }

.hero + .logos { padding-block-start: 2rem; }
.features + .faq { padding-block-start: 3rem; }

.logos:where(.hero + *) { border-block-start: 1px solid; }
```

Why it works:

- `A:has(+ B)` looks ahead. It matches A when B follows it, so A adjusts its own bottom edge.
- `A + B` looks back. It matches B when A precedes it, so B adjusts its own top edge.
- The rules describe pairs, not pages. Whatever order an editor picks, each pair that meets gets its spacing and every other section keeps its default.
- `:where()` adds no specificity, so a default that depends on the neighbor stays easy to override.

Rules:

- A section owns its default padding. Write a pair rule only for a meeting that looks wrong with the defaults.
- Never fix spacing with a spacer element, a per-page override, or a modifier class the template has to work out.
- Put the rule on the section whose edge changes. Look ahead to change a bottom edge and look back to change a top edge.
- Name sections by what they are, such as `.hero` and `.faq`, never by the page they sit on. The pair rules depend on those names.
- Keep the list short. When many pairs share a reason, such as two sections with the same background, write one rule for the reason.
- Where the authoring system has no sibling selectors, keep these few rules in a plain stylesheet.

Support: `:has()` in Chrome 105, Firefox 121, Safari 15.4. The `+` combinator works everywhere.

- Borrowed from: house pattern, used on production CMS sites · Kevin Powell, [The adjacent sibling combinator](https://www.kevinpowell.co/article/the-adjacent-sibling-combinator/) · Jen Simmons, [Using :has() as a CSS Parent Selector and much more](https://webkit.org/blog/13096/css-has-pseudo-class/), 2022-08-18

## 35. Indicator that slides to the active item

Use it for the underline on a tab row or the bar beside a side nav. It replaces a script that measures the active item and writes a `transform` and a width.

```html
<nav class="tabs">
  <ul>
    <li><a href="/overview" aria-current="page">Overview</a></li>
    <li><a href="/pricing">Pricing and billing</a></li>
    <li><a href="/docs">Docs</a></li>
  </ul>
</nav>
```

```css
.tabs { anchor-scope: --active; }

.tabs ul {
  position: relative;
  display: flex;
}

.tabs [aria-current="page"] { anchor-name: --active; }

.tabs ul::after {
  content: "";
  position: absolute;
  position-anchor: --active;
  inset-block-end: 0;
  inset-inline-start: anchor(start);
  inline-size: anchor-size(inline);
  block-size: 2px;
  background: currentColor;
}

@media (prefers-reduced-motion: no-preference) {
  .tabs ul::after {
    transition:
      inset-inline-start 0.25s var(--ease-out, ease-out),
      inline-size 0.25s var(--ease-out, ease-out);
  }
}
```

Why it works:

- The anchor name sits on whichever item carries `aria-current`. Move the attribute and the anchor moves with it. The same attribute tells a screen reader which item is current, so there is no separate "active" class to keep in sync.
- `anchor()` and `anchor-size()` resolve to the item's edge and size. A longer label, a larger font or a wrapped line needs no new measurement.
- The bar is one element whose inset and size change, so a plain transition slides it.

Rules:

- Keep `anchor-scope` on the component root. Without it an anchor name is global, and two navs on one page both follow the last active item.
- The list needs `position: relative`, so the bar is positioned against the box that holds the items.
- For a vertical list swap the axes. Use `inset-block-start: anchor(top)` and `block-size: anchor-size(height)`, and transition those two.
- Give the active item a second cue such as weight or color. A browser without anchor positioning drops the `anchor()` declarations and the bar has no width.

Support: Chrome 131, Firefox 147, Safari 26. Firefox places the bar and does not slide it.

- Borrowed from: Stripe, which ships the vertical form for a side nav in its home page stylesheet. The research found the rules and no page that renders the component, so this is from the stylesheet alone.
- Docs: [MDN: anchor-name](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/anchor-name) · [MDN: anchor-scope](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/anchor-scope) · [MDN: anchor-size()](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/anchor-size)

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

Why it works:

- A scroll timeline is inactive while its scroller has nothing to scroll. An animation on an inactive timeline has no effect, so the keyframes apply only when the content overflows.
- In the first block `from` and `to` hold the same value. Scroll position changes nothing and the animation is an on/off switch.
- The keyframes set a custom property, and custom properties inherit. The scroller and everything inside it can read the result.
- A mask fades the content itself, so it works over any background. An overlay gradient has to match the color behind it.

Rules:

- Write `animation-timeline` after `animation`. The shorthand resets the timeline.
- Declare the default outside the keyframes, as `--fade: 0px` does here.
- Any value can go in the keyframes, including keywords. Stripe flips its navigation to `row-reverse` this way when a translation is too long to fit.
- Write no fallback. Firefox has no scroll timelines, so the row scrolls there without the fade.

Support: `animation-timeline` in Chrome 115 and Safari 26. Firefox has it in Nightly only.

- Borrowed from: Stripe, in the navigation on stripe.com · Bramus Van Damme, [Detect if an element can scroll or not with only CSS](https://www.bram.us/2023/09/16/solved-by-css-scroll-driven-animations-detect-if-an-element-can-scroll-or-not/)
- Docs: [MDN: scroll()](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/animation-timeline/scroll)

## 37. Transition a custom property with `@property`

Use it when one state change should drive several values together, or when a script feeds a number such as pointer position or progress into CSS and the result should ease.

```css
@property --progress {
  syntax: "<number>";
  inherits: true;
  initial-value: 0;
}

.card:focus-within { --progress: 1; }

@media (hover: hover) and (pointer: fine) {
  .card:hover { --progress: 1; }
}

.card .icon {
  display: inline-block;
  rotate: calc(var(--progress) * 90deg);
}

.card .bar {
  transform-origin: left;
  scale: calc(0.25 + var(--progress) * 0.75) 1;
}

.card .more { opacity: var(--progress); }

@media (prefers-reduced-motion: no-preference) {
  .card { transition: --progress 0.4s var(--ease-out, ease-out); }
}
```

Why it works:

- An unregistered custom property is a string, and a string cannot be interpolated. Registering it with a `syntax` gives it a type, and the browser then transitions it like any number.
- One transition with one easing drives every dependent value. The children derive theirs with `calc()`, so the parts stay in step.
- `inherits: true` passes the number down to the children that use it.

Rules:

- `initial-value` is required for every syntax except `"*"`.
- `rotate`, `scale` and `translate` do nothing on an inline element. Give the element `display: inline-block` or another box type first.
- A registration is global. Register each name once and keep the names specific.
- A script only writes the variable, as in `el.style.setProperty("--x", "40%")`. The easing and duration stay in CSS.
- Other useful types are `<length-percentage>` for a gradient position and `<angle>` for a conic gradient.

Support: Chrome 85, Firefox 128, Safari 16.4.

- Borrowed from: Stripe, on the stripe.com home page and its sales contact page
- Docs: [MDN: @property](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@property)

## 38. Whole card clickable from one link

Use it for cards, list rows and tiles where the whole area should navigate. It replaces an `<a>` wrapped around the card, which makes a screen reader read every word as the link text, and it replaces a click handler on a `div`.

```html
<article class="card">
  <h3><a class="card-link" href="/reports/q3">Quarterly report</a></h3>
  <p>Revenue grew in every region.</p>
  <button type="button">Save</button>
</article>
```

```css
.card { position: relative; }

.card-link::after {
  content: "";
  position: absolute;
  inset: 0;
}

.card-link:focus-visible { outline: 2px solid transparent; }

.card:has(.card-link:focus-visible) {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}

.card :is(button, a:not(.card-link)) {
  position: relative;
  z-index: 1;
}
```

Why it works:

- The pseudo-element belongs to the link and covers the card, so a click anywhere activates the link. It is a real link, so open in new tab and the status bar URL still work.
- The link text stays short. A screen reader announces "Quarterly report" and not the whole card.
- `:has()` moves the focus ring from the small link to the card it activates.
- Other controls sit above the overlay and keep their own clicks.

Rules:

- No element between the card and the link may be positioned. The overlay would size itself to that element.
- The link's own ring is made transparent, never removed, as entry 20 requires. Write the full `2px solid transparent`. Safari ignores `outline-color` on its default ring.
- Text under the overlay cannot be selected. Accept it.
- Put hover styles on `.card:hover`, inside the query from entry 21.

Support: Chrome 105, Firefox 121, Safari 15.4.

- Borrowed from: Heydon Pickering, [Cards](https://inclusive-components.design/cards/), for the stretched `::after` · Stripe, for moving the focus ring to the card with `:has()`

## 39. Reveal with `clip-path`

Use it for dropdowns, menus and panels that open over the page and whose height is not known. It unrolls the panel without animating `height`, and it works in every browser.

```css
.menu {
  clip-path: inset(0 -3rem 100%);
  visibility: hidden;
}

.menu.is-open {
  clip-path: inset(0 -3rem -3rem);
  visibility: visible;
}

@media (prefers-reduced-motion: no-preference) {
  .menu {
    transition:
      clip-path 0.25s var(--ease-out, ease-out),
      visibility 0.25s;
  }
}
```

Why it works:

- `inset()` clips from each edge, in the order top, sides, bottom. A bottom value of `100%` hides the whole box. The percentage refers to the element's own height, so nothing has to measure it.
- A negative inset widens the clip beyond the box. That leaves room for the shadow at the sides and the bottom. The top stays at `0`, so no shadow shows where the menu meets its trigger.
- Layout never changes. The panel has its full size the whole time and nothing around it moves.
- The clipped part takes no pointer events, so a closed menu cannot be clicked.
- `visibility` in the transition switches to `hidden` only when the close has finished. That takes the links out of the tab order.

Rules:

- The negative inset must be larger than the shadow's blur plus its offset.
- Use it for panels that overlap the page. A closed panel in the normal flow leaves a gap, so an accordion uses entry 4.
- Add `round` with a radius inside `inset()` only when the clip itself should have round corners. The element's own `border-radius` still applies.

Support: every browser.

- Borrowed from: Stripe, in the navigation menu on stripe.com. The `visibility` part was added for this list.
- Docs: [MDN: inset()](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/basic-shape/inset)

## 40. Shadow change that fades and does not repaint

Use it on cards that lift on hover, most of all in a grid of many cards or with a large blur.

```css
.card {
  position: relative;
  isolation: isolate;
}

.card::before,
.card::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  pointer-events: none;
}

.card::before {
  box-shadow:
    0 1px 4px oklch(0.3 0.05 250 / 0.1),
    0 2px 10px oklch(0.3 0.05 250 / 0.08);
}

.card::after {
  box-shadow:
    0 4px 8px oklch(0.3 0.05 250 / 0.06),
    0 12px 32px oklch(0.3 0.05 250 / 0.16);
  opacity: 0;
}

@media (hover: hover) and (pointer: fine) {
  .card:hover::before { opacity: 0; }
  .card:hover::after { opacity: 1; }
}

@media (prefers-reduced-motion: no-preference) {
  .card::before,
  .card::after { transition: opacity 0.3s ease; }
}
```

Why it works:

- A `box-shadow` transition repaints the shadow on every frame. Each shadow here is painted once, and the transition changes only `opacity`, which the compositor handles. In a Chrome trace of one card it took 12 paint events, against about 78 for a plain `box-shadow` transition.
- The two shadows cross-fade, so the end state is exactly the raised shadow and not the sum of both.
- `isolation: isolate` gives the card its own stacking context. `z-index: -1` then puts the pseudo-elements above the card's background and below its content.

Rules:

- The card needs its own background. The pseudo-elements have none.
- It uses both pseudo-elements of the card. Entry 27 uses `::after` for the hit area and entry 38 for the link, so do not combine them on one element.
- For a single small element, transition `box-shadow` directly. The saving is real but small per card.

Support: every browser.

- Borrowed from: Stripe, on its resource cards · Tobias Ahlin, [How to animate box-shadow](https://tobiasahlin.com/blog/how-to-animate-box-shadow/), for the older form of the idea

## Left out on purpose

Decided on 2026-10-01. Do not add these back.

- **The layout half of Travis Arnold's reset.** `* { grid-area: 1 / 1 / 1 / 1 }`, a 12-column grid on `body`, and `display: contents` on `div` and every sectioning element. It stacks everything in one cell and removes the box of every container, which breaks the content grid in entry 1 and any component that styles a `div`.
- **`* { text-box: trim-both cap alphabetic }`** in the reset. It shrinks every text block. A one-line paragraph at 16px/1.5 went from 25px tall to 11px and a button from 40px to 27px. Entry 33 is the scoped version, for labels only.
- **`text-rendering: optimizeLegibility`.** MDN recommends `auto` for body text.

## Next

Held for later:

- Scroll-driven reveal with `animation-timeline: view()`. Chrome and Safari 26 have it. Firefox does not.
- Customizable `<select>` with `appearance: base-select`. Safari 27 shipped it in September 2026 and Firefox has it behind a flag.
- One `box-shadow` built from independent layers, from Stripe's docs site. Marked maybe on 2026-10-01.

## References

Cloned into `refs/`, which git ignores. They drive decisions here and are not copied wholesale.

How to write a skill, for when this list becomes one:

- Matt Pocock, [mattpocock/skills](https://github.com/mattpocock/skills) at `refs/mattpocock-skills`
- poteto, [cursor/plugins, pstack/skills](https://github.com/cursor/plugins/tree/main/pstack/skills) at `refs/cursor-plugins/pstack/skills`
- Emil Kowalski, [emilkowalski/skills](https://github.com/emilkowalski/skills) at `refs/emilkowalski-skills`

What comes from Emil Kowalski, and what stays with him:

- This list borrows the declarations every project should ship: the motion tokens in entry 30, press feedback in 31, the touch rules in the reset, safe areas in 32 and the hover query in 21.
- His skills keep the judgment. Use them directly for deciding whether something should animate, designing or reviewing motion, springs, gestures and drag, and checking a web app on a real phone. The ones to reach for are `animate`, `review-animations`, `improve-animations`, `find-animation-opportunities` and `mobile-native`.
- When the two disagree on a value, his skill wins and this list gets corrected.
