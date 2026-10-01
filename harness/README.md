# Harness

One page that previews every entry in `PRACTICES.md`, each with a live specimen.

```sh
bun install
bun dev          # http://localhost:4310
bun dev --host   # also reachable from a phone on the same network
```

The page reloads when `PRACTICES.md` or a fixture changes.

`bun run build` writes a static copy to `dist/`, one page per specimen. It is published at https://topaz-birch-agy2.here.now/.
The published site is a snapshot: a new or changed fixture shows up only after a rebuild and a republish. The command is at the top of `deploy/build.js`.

## How it works

`PRACTICES.md` is the only source. A numbered `##` section is an entry. Any other `##` section is shown as text at the end.

A specimen runs the entry's own code blocks, verbatim: the CSS, the HTML and the JS. Nothing is copied into the harness, so what you see is what the entry says. Each specimen is also a page of its own at `/specimen/<slug>`. The icon at the end of a frame's bar opens it. Use that URL to test in another browser or on a touch device.

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

- The `<template>` holds the check shown above the frame and the frame's starting height in px.
- A specimen that needs more in its viewport meta tag adds it to the `<template>`, as in `data-viewport="viewport-fit=cover"`.
- Put every style in `@layer demo`. The entry's CSS is unlayered, so it wins wherever the two meet and a fixture cannot mask a broken technique.
- To change a value the entry sets, such as a width that must fit the frame, use an inline `style` and say so in a comment.
- Write `<!-- html -->` where the entry's HTML blocks should go. Write it twice for two copies.
- Build with what `demos/base.css` gives you: the `--bp-*` tokens, `.box`, `.hatch`, `.label` and the button style.
- Never restate the technique in a fixture. If the specimen needs a rule the entry lacks, the entry is missing it.

Renaming an entry's title changes its slug. Rename the fixture to match.

## Files

- `practices.js` reads the numbered entries of `PRACTICES.md`. Its other sections are about the list and are not shown.
- `frame.js` builds a specimen page from an entry and its fixture.
- `main.js`, `index.html`, `harness.css` are the page around the specimens.
- `tokens.css` holds the blueprint fonts and colors, shared by the page and the specimens.
- `public/fonts` holds Paper Mono, the monospace font, with its license.
- `../vite.config.js` serves `/specimen/<slug>`.
