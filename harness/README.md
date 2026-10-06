# Harness

One page that previews every entry in `PRACTICES.md`, each with a live specimen.

```sh
bun install
bun dev          # http://localhost:4310
bun dev --host   # also reachable from a phone on the same network
```

The page reloads when `PRACTICES.md` or a fixture changes.

`bun run build` writes a static copy to `dist/`, one page per specimen. A push to `main` builds it on Vercel and publishes it at https://good-css.vercel.app/.

The dev server also serves the pages of `deploy/pages`, at `/about`, `/contact`, `/privacy` and `/not-found`.

## How it works

`PRACTICES.md` is the only source. A `##` section with `###` sections under it is a category, and each `###` is an entry. Any other `##` section is about the list and is not shown.

A specimen runs the entry's own code blocks, verbatim: the CSS, the HTML and the JS. Nothing is copied into the harness, so what you see is what the entry says. Each specimen is also a page of its own at `/specimen/<slug>`. The button at the end of a frame's bar opens it. Use that URL to test in another browser or on a touch device.

The page lists the entries by category, in the order of the file. An entry's number is its place in its category. An entry names another one with a link to its heading, such as `[The reset](#the-reset)`, and each entry sits on the page under that same slug.

## Adding a specimen

An entry with no fixture shows a dashed box that names the file to add. Create `demos/<slug>.html`, where the slug is the entry's title in lowercase with hyphens. There is nothing to register.

```html
<template data-specimen data-height="400">
  What a pass looks like, in a sentence or two.
</template>

<style>
  @layer demo {
    /* cosmetics only */
  }
</style>

<div class="grid">…</div>
```

- The `<template>` holds the check shown under the frame and the frame's starting height in px.
- A specimen that needs more in its viewport meta tag adds it to the `<template>`, as in `data-viewport="viewport-fit=cover"`.
- Put every style in `@layer demo`. The entry's CSS is unlayered, so it wins wherever the two meet and a fixture cannot mask a broken technique.
- To change a value the entry sets, such as a width that must fit the frame, use an inline `style` and say so in a comment.
- Write `<!-- html -->` where the entry's HTML blocks should go. Write it twice for two copies.
- Build with what `demos/base.css` gives you: the `--bp-*` tokens, `.box` for a surface with a line round it, `.placeholder` for a sulphur block that stands in for an image, `.label` for a caption, `output` for a value a script reads, and the button and field styles. Text on a sulphur block takes `--bp-on-fill`.
- A specimen is drawn on a dark panel, or on a light one when its URL asks for `?panel=light`. The page asks for the light panel in its dark bands, so each specimen shows on the panel its band gives it. Name a role, such as `--bp-ink` or `--bp-panel`, and never a color, and the fixture reads on both.
- Put readouts in `<footer class="status">` as the last child of the body, one `<p>name <output></output></p>` each. It docks to the bottom of the specimen as a bar of readouts, one cell each, like the bar of the frame above. A value that belongs beside a control stays there.
- Wrap a small subject in an element with the class `center` and it sits in the middle of the stage, both ways. Leave a specimen that shows a layout, or whose position is the point, as it is.
- The dots are the stage's alone. Whatever lies on it is opaque, and running text goes in a `.box`. A specimen that is a whole page covers the stage with `:root { background: var(--bp-panel); }`.
- Never restate the technique in a fixture. If the specimen needs a rule the entry lacks, the entry is missing it.
- Write a fixture's own CSS the way the list says, as in the "In all CSS" rules of `skills/good-css/SKILL.md`: `inline` and `block` properties, colors in `oklch()` with `none` as the hue of a gray, each `:hover` inside `@media (hover: hover) and (pointer: fine)`, and `overflow: clip` unless something scrolls.

The page in `harness.css` follows the list too, and starts with the reset as the entry has it. `demos/base.css` follows the same rules but holds none of the entries, so a specimen never works because of something its fixture brought.

Renaming an entry's title changes its slug. Rename the fixture to match.

## Files

- `practices.js` reads the categories and entries of `PRACTICES.md`. Its other sections are about the list and are not shown.
- `frame.js` builds a specimen page from an entry and its fixture.
- `main.js`, `index.html`, `harness.css` are the page around the specimens.
- `tokens.css` holds the fonts and colors, shared by the page and the specimens.
- `public/fonts` holds Inter and Geist Mono, the two fonts, each with its license.
- `public/mark.svg`, `public/wordmark.svg` and `public/icons` are exports from the Figma file of the design. Their letters are outlines, so they need no font. The page draws them as masks, so they take the color of their band.
- `categories` holds the drawing of each category, named by its slug. The page puts it in as markup, so its lines take the color of what holds it. Its solids are webp files in `public/art`, beside the box model of the hero.
- `public/patterns` holds the box model drawn as lines, in three shapes, for the backgrounds of the hero, the stats band and the footer.
- `../deploy/page.js` holds the header and the footer of every page.
- `../vite.config.js` serves `/specimen/<slug>` and the pages, and puts the header and the footer into the index.
