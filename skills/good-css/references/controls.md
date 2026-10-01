<!-- Generated from PRACTICES.md by scripts/build-skill.js. Do not edit. -->

## 20. One focus ring with `:focus-visible`

Use it as the focus style for every interactive element. Never write `outline: none`.

```css
:focus-visible {
  outline: max(2px, 0.08em) solid currentColor;
  outline-offset: 0.25em;
}
```

Rules:

- On a filled button `currentColor` can fail contrast. Set the outline to the button's background color there.
- A component that draws its ring with `box-shadow` keeps `outline-color: transparent`, never `outline: none`, so forced-colors mode can repaint it.

Support: Chrome 86, Firefox 85, Safari 15.4.

## 21. Hover styles only where hover exists

Use it on every `:hover` rule, so a tap on a touch screen does not leave the hover state stuck.

```css
@media (hover: hover) and (pointer: fine) {
  .button:hover { background: var(--primary-hover); }
}
```

Rules:

- Tailwind v4's `hover:` variant wraps itself in `(hover: hover)` only. Write the full query by hand everywhere else.
- Touch users still need feedback on press. Give it with `:active`, which works for every input.

Support: Chrome 38, Firefox 64, Safari 9.

## 31. Press feedback

Use it on every button and anything else that can be pressed.

```css
.button:active { transform: scale(0.97); }

@media (prefers-reduced-motion: no-preference) {
  .button { transition: transform 160ms var(--ease-out, ease-out); }
}
```

Rules:

- Keep the scale between 0.95 and 0.98.
- The reset in entry 6 (`foundation.md`) removes the browser's tap highlight. Without this entry a tap gives no feedback at all.
- When feedback needs a script, listen for `pointerdown`, not `click`.

Support: every browser.

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

Rules:

- `overflow: hidden` or `clip` on the button cuts the area off.
- It does not work on `<input>`, which has no pseudo-elements. Wrap it in a `<label>`.

Support: Chrome 87, Firefox 66, Safari 14.1.

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

Rules:

- No element between the card and the link may be positioned. The overlay would size itself to that element.
- The link's own ring is made transparent, never removed, as entry 20 requires. Write the full `2px solid transparent`. Safari ignores `outline-color` on its default ring.
- Text under the overlay cannot be selected. Accept it.
- Put hover styles on `.card:hover`, inside the query from entry 21.

Support: Chrome 105, Firefox 121, Safari 15.4.

## 18. `:has()` for parent and page state

Use it wherever a script adds a class to a parent because of what it contains or what state a child is in.

```css
article:has(img) { grid-column: span 2; }
h2:has(+ p) { margin-block-end: 0; }
form:has(:focus-visible) { background: var(--surface-raised); }

html { scrollbar-gutter: stable; }
html:has(dialog:modal) { overflow: hidden; }
```

Rules:

- `:modal` matches `showModal()` only, so a non-modal dialog does not lock the page.
- Keep `scrollbar-gutter: stable` with the scroll lock. Without it the page shifts sideways when the scrollbar disappears. Entry 6 (`foundation.md`) sets it in the reset.
- `:has()` cannot be nested inside `:has()`.

Support: Chrome 105, Firefox 121, Safari 15.4.

## 19. Form feedback with `:user-invalid`

Use it for inline form validation, in place of blur listeners and a "touched" class.

```css
input:user-invalid { border-color: var(--danger); }
input:user-valid { border-color: var(--success); }
```

```html
<input type="password" required minlength="8">
```

Rules:

- Color alone is not enough feedback. Pair it with text or an icon.
- The server still validates.

Support: Chrome 119, Firefox 88, Safari 16.5.

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

Rules:

- Bound it with `min-height` and `max-height`. A fixed `height` brings the fixed size back. Past `max-height` the textarea scrolls.
- Put the border and background on the wrapper and leave the textarea bare. The box the user sees must be the one that animates.
- Keep the wrapper `content-box`. The observer writes the textarea's full height, and a `border-box` wrapper would subtract its own border from it.
- Write no fallback. A browser without `field-sizing` shows a fixed textarea that scrolls.

Support: Chrome 123, Safari 26.2, Firefox 152. Baseline newly available since June 2026.

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

Rules:

- It does nothing on a flex or grid container. A button that is `inline-flex` because it holds an icon needs the declaration on the element that wraps the text, as in the second rule of the block.
- The button gets shorter, because the padding now starts at the letters. With `0.75rem` of padding it went from 48px tall to 35px in Chrome and Safari. Raise the padding to keep the height.
- Use it for one line. Descenders hang into the bottom padding, which is the intent.
- Scope it to labels. Never set it on `*`, which "Left out on purpose" covers.
- Write no fallback. Without support the label keeps its normal line box.

Support: Chrome 133, Firefox 154, Safari 18.2.

## 28. Tabular numbers

Use it on any number that changes or sits in a column, such as prices, tables, timers and counters.

```css
.price,
td,
time { font-variant-numeric: tabular-nums; }
```

Rules:

- Do not set it globally. Proportional digits read better in prose.
- The font must ship tabular figures, or nothing changes.

Support: Chrome 52, Firefox 34, Safari 9.1.

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

Rules:

- Derive the outer radius from the inner one. The other way round reaches zero once the padding exceeds the radius.

Support: every browser.
