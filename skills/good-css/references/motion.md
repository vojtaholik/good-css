<!-- Generated from PRACTICES.md by scripts/build-skill.js. Do not edit. -->

## 22. Opt-in motion

Use it for every transition or animation that moves or scales something.

```css
.box:hover { transform: scale(1.2); }

@media (prefers-reduced-motion: no-preference) {
  .box { transition: transform 300ms; }
}
```

Rules:

- Build the state change first and add the motion inside the query. Do not strip motion afterwards with a global rule that sets every duration to `0.01ms`.
- Fades of opacity and color are not motion and can stay outside the query.
- Animation driven by a script checks the same query with `matchMedia`.

Support: Chrome 74, Firefox 63, Safari 10.1.

## 30. Motion tokens

Use them in every transition and animation. Two easing curves, defined once, and a rule for durations.

```css
:root {
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
}

.dropdown { transition: opacity 180ms var(--ease-out); }
```

Rules:

- Never use `ease-in` on UI. It starts slow and reads as lag.
- Keep UI transitions under 300ms. Press feedback takes 100 to 160ms, tooltips and small popovers 125 to 200ms, dropdowns 150 to 250ms, modals and drawers 200 to 500ms.
- Name the properties in a transition. Never write `transition: all`.
- Other entries write `var(--ease-out, ease-out)`, so their snippets work before these tokens exist.
- Whether something should animate at all is not a CSS question. Emil Kowalski's `animate` and `review-animations` skills answer it.

Support: every browser.

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

Rules:

- `initial-value` is required for every syntax except `"*"`.
- `rotate`, `scale` and `translate` do nothing on an inline element. Give the element `display: inline-block` or another box type first.
- A registration is global. Register each name once and keep the names specific.
- A script only writes the variable, as in `el.style.setProperty("--x", "40%")`. The easing and duration stay in CSS.
- Other useful types are `<length-percentage>` for a gradient position and `<angle>` for a conic gradient.

Support: Chrome 85, Firefox 128, Safari 16.4.

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

Rules:

- The card needs its own background. The pseudo-elements have none.
- It uses both pseudo-elements of the card. Entry 27 (`controls.md`) uses `::after` for the hit area and entry 38 (`controls.md`) for the link, so do not combine them on one element.
- For a single small element, transition `box-shadow` directly. The saving is real but small per card.

Support: every browser.

## 25. Cross-document view transitions

Use it on any multi-page site to crossfade between pages. It replaces a client-side router or a page-transition script.

```css
@view-transition { navigation: auto; }
```

Rules:

- Both pages must include the rule.
- The default crossfade adds no movement and needs no reduced-motion guard. If you add slides, put the rule inside `@media (prefers-reduced-motion: no-preference)`.

Support: Chrome 126, Safari 18.2. Firefox navigates as normal.
