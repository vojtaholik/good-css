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

`PRACTICES.md` is the only source. A numbered `##` section is an entry. Any other `##` section is shown as text at the end.

A specimen runs the entry's own code blocks, verbatim: the CSS, the HTML and the JS. Nothing is copied into the harness, so what you see is what the entry says. Each specimen is also a page of its own at `/specimen/<slug>`. The button at the end of a frame's bar opens it. Use that URL to test in another browser or on a touch device.

The page lists the entries by category, in the order `categories.js` gives.

## Adding a specimen

An entry with no fixture shows a hatched box that names the file to add. Create `demos/<slug>.html`, where the slug is the entry's title in lowercase with hyphens. There is nothing to register.

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
- Build with what `demos/base.css` gives you: the `--bp-*` tokens, `.box` for a white surface, `.placeholder` for a block that stands in for an image, `.label` for a caption, `output` for a value a script reads, `.readouts` for a row of them, and the button and field styles.
- The hatch is the stage's alone. Whatever lies on it is opaque, and running text goes in a `.box`. A specimen that is a whole page covers the stage with `:root { background: var(--bp-panel); }`.
- Never restate the technique in a fixture. If the specimen needs a rule the entry lacks, the entry is missing it.
- Write a fixture's own CSS the way the list says, as in the "In all CSS" rules of `skills/good-css/SKILL.md`: `inline` and `block` properties, colors in `oklch()` with `none` as the hue of a gray, each `:hover` inside `@media (hover: hover) and (pointer: fine)`, and `overflow: clip` unless something scrolls.

The page in `harness.css` follows the list too, and starts with the reset of entry 6 as written. `demos/base.css` follows the same rules but holds none of the entries, so a specimen never works because of something its fixture brought.

Renaming an entry's title changes its slug. Rename the fixture to match.

## Files

- `practices.js` reads the numbered entries of `PRACTICES.md`. Its other sections are about the list and are not shown.
- `frame.js` builds a specimen page from an entry and its fixture.
- `main.js`, `index.html`, `harness.css` are the page around the specimens.
- `tokens.css` holds the fonts and colors, shared by the page and the specimens.
- `public/fonts` holds Paper Mono, the monospace font, with its license.
- `public/mark.svg`, `public/wordmark.svg`, `public/arrow.svg` and `public/icons` are exports from the Figma file of the design. Their letters are outlines, so they need no font.
- `../deploy/page.js` holds the header and the footer of every page.
- `../vite.config.js` serves `/specimen/<slug>` and the pages, and puts the header and the footer into the index.

Headings are set in Code Next, a commercial font that is not in the repo and is not served. A reader who has it installed sees it. Everyone else sees Montserrat, the next font in `--bp-font-display`.
