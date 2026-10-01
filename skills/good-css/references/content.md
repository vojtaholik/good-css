<!-- Generated from PRACTICES.md by scripts/build-skill.js. Do not edit. -->

## 41. Long text that wraps, truncates or clamps

Use it on any text that comes from a user or a CMS, such as names, titles, URLs and excerpts. Decide for each one what happens when the content is longer than the design. It wraps, it is cut to one line, or it is cut to a few lines.

```css
:root { overflow-wrap: break-word; }

.name {
  white-space: nowrap;
  overflow: clip;
  text-overflow: ellipsis;
}

.excerpt {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: clip;
}
```

Rules:

- Put the truncation on the element that holds the text. On a flex or grid container the text is cut and no ellipsis appears.
- Every flex item between the row and the truncated text must be able to shrink. The reset's `min-width: 0` covers that. Without the reset, set `min-inline-size: 0` on each of them.
- The clamp needs all four declarations. Unprefixed `line-clamp` is in no browser yet.
- Put padding on a wrapper, never on the clamped element. The next line shows through the bottom padding.
- Use `break-word` on the root and not `anywhere`. `anywhere` also shrinks the minimum content width, so a box sized by its content collapses to one letter per line.
- A table with automatic layout ignores `break-word`. Set `overflow-wrap: anywhere` on the cell.
- Truncate only text the reader can get in full somewhere else. Never truncate text they have to read.

Support: `text-overflow`, `-webkit-line-clamp` and `overflow-wrap: break-word` work everywhere. With `overflow: clip` the ellipsis and the clamp draw in Chrome 150 and Safari 27, tested on 2026-10-01. Firefox is untested, and `overflow: hidden` is the form to fall back to. `overflow-wrap: anywhere` in Chrome 80, Firefox 65, Safari 15.4.

## 42. Image box that holds any upload

Use it on every image, video or embed whose file you do not control, such as thumbnails, cover photos and avatars. The box keeps its shape whatever the file's ratio, and it has that shape before the file loads.

```css
.thumb {
  inline-size: 100%;
  block-size: auto;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  background-color: var(--surface-muted, oklch(0.9 0 none));
}

.avatar {
  flex: none;
  inline-size: 3.5rem;
  block-size: 3.5rem;
  border-radius: 50%;
  object-fit: cover;
  outline: 1px solid light-dark(oklch(0 0 none / 0.1), oklch(1 0 none / 0.1));
  outline-offset: -1px;
}
```

Rules:

- One axis must be `auto`. A `height` attribute or a fixed height wins over the ratio. The reset sets `height: auto` on `img`, `svg` and `video`, and `block-size: auto` here does the same for an `iframe`.
- `object-fit` does nothing until the box has both sizes or a ratio.
- `cover` crops. Use `contain` for logos, product shots and anything that must stay whole. Move the crop with `object-position`.
- Leave the background color off an image that has transparent areas. It shows through them.
- A fixed-size image in a flex row needs both sizes, as the avatar has. With only a width it stretches to the height of the row.
- In Safari a failed image ignores `aspect-ratio` and draws a square box. Where a failed load must not move the layout, put the ratio on a wrapper and give the image `inline-size: 100%` and `block-size: 100%`.
- `light-dark()` needs the `color-scheme` from entry 8 (`foundation.md`). Without it the outline stays black on a dark page.

Support: `aspect-ratio` in Chrome 88, Firefox 89, Safari 15. An outline that follows the radius in Chrome 94, Firefox 88, Safari 16.4. `light-dark()` in Chrome 123, Firefox 120, Safari 17.5. The square box of a failed image is from real Safari 27, tested on 2026-10-01. Chrome 150 keeps the ratio.
