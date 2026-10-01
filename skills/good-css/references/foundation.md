<!-- Generated from PRACTICES.md by scripts/build-skill.js. Do not edit. -->

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

Rules:

- Load every weight and style the design uses. With `font-synthesis: none` a missing bold renders as regular.
- The reset removes the tap highlight, so every pressable element needs its own `:active` state. Entry 31 (`controls.md`) has it.
- Never fix input zoom with `user-scalable=no` or `maximum-scale=1`. That takes zoom away from people who need it.
- Keep `user-select: none` to controls. Never set it on `body` or on links, because people copy text.
- Text the user types inherits `pretty`, in `textarea` and `contenteditable`. If lines shift while typing, set `text-wrap: stable` on that element.
- The reserved gutter puts centered content slightly off-center on a page too short to scroll. Chris Coyier documents this. Accept it.
- `svh` is for documents and heroes. An app shell with UI pinned to the bottom uses `height: 100dvh`, so it tracks the toolbar. Emil Kowalski draws this line in his mobile-native skill.

Support: `text-wrap: pretty` in Chrome 117 and Safari 26, ignored by Firefox. `scrollbar-gutter` in Chrome 94, Firefox 97, Safari 18.2. `interpolate-size` in Chrome 129 only. The rest works everywhere.

## 2. OKLCH color

Write colors in `oklch()` and derive every related color from a base with `color-mix(in oklch, …)`. Never hardcode a second hex or an `rgba()` for a hover, tint or transparent version.

```css
:root {
  --primary: oklch(55% 0.15 250);
  --primary-hover: color-mix(in oklch, var(--primary), black 15%);
  --primary-subtle: color-mix(in oklch, var(--primary) 12%, transparent);
}
```

Rules:

- Write grays, white and black with `none` as the hue, as in `oklch(98% 0 none)`. A written hue of `0` is red, and it pulls every mix toward red. Half white `oklch(1 0 0)` and half a blue at hue 264 came out at hue 312 in Chrome and Safari. With `none`, or with the keyword `white`, it stayed at 264.

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

Rules:

- Switch themes by setting `color-scheme`. Never redefine the tokens.
- The grays use `none` for the hue, so they can be mixed with a color later without drifting toward red. Entry 2 has the measurement.
- `light-dark()` takes two colors. Anything else that differs by theme, such as an image, needs its own rule.
- Add `<meta name="color-scheme" content="light dark">` so the browser paints the right background before the CSS loads.

Support: Chrome 123, Firefox 120, Safari 17.5. Baseline since May 2024.

## 7. Fluid sizes with `clamp()`

Use it for anything that should grow with the screen, starting with font sizes and section spacing. One declaration replaces a ladder of breakpoint overrides.

```css
:root {
  --text-body: clamp(1rem, 0.75rem + 1vw, 1.75rem);
  --space-section: clamp(3rem, 1rem + 6vw, 8rem);
}
```

Rules:

- Write the preferred value as `rem + vw`, never `vw` alone. `clamp(1rem, 1vw, 1.75rem)` stays at 16px on every screen narrower than 1600px, because 1vw is smaller than 1rem until then. A bare `vw` value also ignores the reader's font size setting.
- Work the preferred value out from two points. The slope is `(max - min) / (wide - narrow)`, in px over px, and times 100 it is the `vw` number. The `rem` part is `min - slope × narrow`.
- Keep both bounds in `rem` so they follow the reader's font size.
- Put fluid values in tokens. Components use the token and never repeat the math.

## Left out on purpose

Decided on 2026-10-01. Do not add these back.

- **The layout half of Travis Arnold's reset.** `* { grid-area: 1 / 1 / 1 / 1 }`, a 12-column grid on `body`, and `display: contents` on `div` and every sectioning element. It stacks everything in one cell and removes the box of every container, which breaks the content grid in entry 1 (`layout.md`) and any component that styles a `div`.
- **`* { text-box: trim-both cap alphabetic }`** in the reset. It shrinks every text block. A one-line paragraph at 16px/1.5 went from 25px tall to 11px and a button from 40px to 27px. Entry 33 (`controls.md`) is the scoped version, for labels only.
- **`text-rendering: optimizeLegibility`.** MDN recommends `auto` for body text.
