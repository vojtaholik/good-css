<!-- Generated from PRACTICES.md by scripts/build-skill.js. Do not edit. -->

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

Rules:

- Every child must be placed. An unplaced child of the grid lands in the gutter track.
- Every direct child is a grid item. Wrap a run of inline elements in one element.
- Change a width by overriding `--content`, not by writing a new column template.

In other systems: the column template goes wherever the project defines reusable styles. Where child selectors are not available, as in StyleX or Tailwind without a custom variant, each child sets its own `grid-column` to `content`, `breakout` or `full-width`.

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

Rules:

- A section owns its default padding. Write a pair rule only for a meeting that looks wrong with the defaults.
- Never fix spacing with a spacer element, a per-page override, or a modifier class the template has to work out.
- Put the rule on the section whose edge changes. Look ahead to change a bottom edge and look back to change a top edge.
- Name sections by what they are, such as `.hero` and `.faq`, never by the page they sit on. The pair rules depend on those names.
- Keep the list short. When many pairs share a reason, such as two sections with the same background, write one rule for the reason.
- Where the authoring system has no sibling selectors, keep these few rules in a plain stylesheet.

Support: `:has()` in Chrome 105, Firefox 121, Safari 15.4. The `+` combinator works everywhere.

## 45. Space between siblings set by the parent

Use it wherever elements sit one above another, such as form fields, the parts of a card or the blocks of an article. The parent sets one space between its children, and no child carries a block margin of its own.

```css
.fields {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.prose > * { margin-block: 0; }
.prose > * + * { margin-block-start: var(--flow-space, 1em); }

.prose > :is(h2, h3) { --flow-space: 2em; }
.prose > :is(h2, h3) + * { --flow-space: 0.5em; }
```

Rules:

- Use the flex form in a component whose children you know. Use the margin form for content you do not control, such as CMS or Markdown output, because flex turns every child into a flex item.
- A flex column stretches its children, so a button or link that is a direct child becomes full width. Set `align-self: start` on it.
- In the margin form, zero the children's block margins first. Without that line the browser's default margins stay above the first child and below the last.
- Keep the `>`. Without it the rule reaches every nested element, list items included.
- The margin form counts a hidden child, so a hidden first child leaves a space at the top. `gap` ignores hidden children.

Support: `gap` in flex layout in Chrome 84, Firefox 63, Safari 14.1. `:is()` in Chrome 88, Firefox 78, Safari 14.

## 46. Push one item away with an auto margin

Use it when one item in a flex row or column sits apart from the rest, such as the actions at the bottom of a card, the account link at the end of a toolbar, or a title centered in a full-height section between a header and a footer.

```css
.card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.card > .actions { margin-block-start: auto; }

.toolbar {
  display: flex;
  gap: 1rem;
}

.toolbar > .account { margin-inline-start: auto; }

.hero {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-block-size: 100svh;
}

.hero > h1 { margin-block: auto; }
```

Rules:

- The container needs free space. A card has it when a grid row stretches it to match a taller neighbor. A column that is the only child of a taller box needs `block-size: 100%`.
- The centered item is centered in the space left over, not in the section. A footer with no header pulls the title up by half the footer's height.
- Write `min-block-size`, never `block-size`. A fixed height cuts off long content.
- This is a flex technique. In a grid column the spare height goes to the rows first and every child grows.
- It replaces a spacer element, `space-between` on a container with more than two children, and a wrapper around the group that should stay together.

Support: auto margins work wherever flexbox does. `margin-block` in Chrome 87, Firefox 66, Safari 14.1. `svh` in Chrome 108, Firefox 101, Safari 15.4.

## 11. Intrinsic grid

Use it for any set of equal cards or tiles. It replaces a column count per breakpoint.

```css
.grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
}
```

Rules:

- `auto-fit` stretches a short row to fill the width. Use `auto-fill` when the item count changes, such as a filtered list, so cards keep their size.

Support: Chrome 79, Firefox 76, Safari 11.1.

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

Rules:

- The span must equal the number of parts in the card. Without `grid-row: span N` every part piles into one row.
- Set `row-gap` on the card, or it inherits the parent's gap between its parts.

Support: Chrome 117, Firefox 71, Safari 16.

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

Rules:

- The container must be an ancestor. An element cannot query itself.
- A container cannot take its width from its content. Never put `container-type` on a shrink-to-fit element, or it collapses to zero.
- With no container ancestor the query never matches. Kevin Powell makes `header`, `main` and `footer` containers in his reset, so most components need none of their own.
- A container cannot also be a subgrid. Entry 13 and this one need separate elements.
- Container units are different from queries. With no container above the element, `cqi` measures the viewport, so one token written with `cqi` serves the page and every slot.
- Never register a fluid token that uses `cqi` with `@property`. A registered length computes once on `:root`, where there is no container, and every slot then gets the viewport's value.

Support: Chrome 105, Firefox 110, Safari 16.

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

Rules:

- The wrap point is a share of the container, not a length. Change `min-inline-size` to move it.
- Drop the sidebar's `flex-basis` for a sidebar sized by its content.
- For a sticky sidebar, add `align-self: start` beside `position: sticky` and its inset. The two sides stretch to the same height, and a stretched sidebar has no room to stick.
- A bare `img` or `video` as one of the sides stretches to the height of the row and distorts. Set `align-items: start` on the container.

Support: Chrome 84, Firefox 63, Safari 14.1.

## 10. Stack layers with grid

Use it whenever things sit on top of each other, such as text over an image, a badge on a card, or two icons that swap. It replaces `position: absolute` with its offsets, sizes and transforms.

```css
.stack { display: grid; }
.stack > * { grid-area: 1 / 1; }

.stack > .title { place-self: center; }
.stack > .badge { place-self: start end; }
```

Rules:

- A layer later in the DOM paints on top. Use `z-index` only to change that order.
- Keep `position: absolute` for a layer that must not affect the container's size.

## 15. Safe alignment

Use it wherever content is centered or end-aligned in a container that can become too small, such as a tab row, a toolbar or a vertically centered modal.

```css
.tabs {
  display: flex;
  overflow-x: auto;
  justify-content: safe center;
}
```

Rules:

- It works on every `align-*`, `justify-*` and `place-*` property.
- Auto margins on the item center it the same way and are safe in every browser that has flexbox. Entry 46 has them.

Support: Chrome 115, Firefox 63, Safari 17.6.

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

Rules:

- The four-value `margin`, `padding` and `inset` shorthands stay physical. Use the `-inline` and `-block` shorthands.

Support: Chrome 87, Firefox 66, Safari 14.1.

## 17. `overflow: clip` over `hidden`

Use it whenever you want to cut off overflow and do not need scrolling.

```css
.hero { overflow-x: clip; }
```

Rules:

- Put it on the element that overflows, not on `html` or `body`.
- Keep `hidden` or `auto` for elements a script scrolls. `clip` blocks that too.
- Keep `hidden` or `auto` on an element with `resize`. With `clip` the browser draws no resize handle.

Support: Chrome 90, Firefox 81, Safari 16.
