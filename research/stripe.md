# Techniques from Stripe's shipped CSS

Research for `PRACTICES.md`, done on 2026-10-01. Eight candidates, ranked best first, then what I looked at and rejected.

## How I studied it

I read the stylesheets Stripe serves, not articles about them. `curl` fetched the HTML and every linked or inline stylesheet for stripe.com home, `/payments`, `/pricing`, `/billing`, `/radar`, `/issuing`, `/jobs`, `/contact/sales` and docs.stripe.com. That is about 1.6 MB of CSS. I then opened the pages in headless Chrome 150 through `agent-browser` to read computed styles and watch behaviour.

Stripe runs three CSS systems at once, and the candidates come from the two newer ones.

- Home, `/billing`, `/radar`, `/issuing`, `/jobs` and `/contact/sales` use a new system with `hds-` class names, served from `b.stripecdn.com/mkt-ssr-statics/assets/_next/static/css/`. It declares `@layer reset, base, app`, and the home page bundle uses logical properties 418 times.
- `/payments`, `/pricing` and most product pages still use an older system with one stylesheet per component and camelCase custom properties.
- docs.stripe.com uses Sail, Stripe's app design system, shipped as inline `<style>` blocks with 40 `@property` registrations.

Limits of this research:

- I ran every snippet below in headless Chrome 150 only. Safari 27 is installed but its remote automation is switched off, and Firefox is not installed. Every Firefox and Safari statement comes from MDN browser-compat-data, fetched the same day, and is not tested.
- The stylesheet URLs contain build hashes. They were live on 2026-10-01 and will change when Stripe deploys.
- Each snippet is my own generic rewrite. Where it differs from what Stripe ships, the evidence line says how.

## 1. Indicator that slides to the active item

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
      inset-inline-start 0.25s ease-out,
      inline-size 0.25s ease-out;
  }
}
```

Why it works:

- The anchor name sits on whichever item carries `aria-current`. Move the attribute and the anchor moves with it. The same attribute tells a screen reader which item is current, so there is no separate "active" class to keep in sync.
- `anchor()` and `anchor-size()` resolve to the item's edge and size. The bar takes its position and length from the item itself, so a longer label, a larger font or a wrapped line needs no new measurement.
- The bar is one element whose inset and size change, so a plain transition slides it.

Rules:

- Keep `anchor-scope` on the component root. Without it an anchor name is global. Two navs whose indicators share a containing block then both follow the last active item on the page.
- The list needs `position: relative`, so the bar is positioned against the box that holds the items.
- For a vertical list swap the axes. Use `inset-block-start: anchor(top)` and `block-size: anchor-size(height)`, and transition those two.
- Give the active item a second cue such as weight or color. A browser without anchor positioning drops the `anchor()` declarations and the bar has no width.
- Firefox places the bar but does not slide it. MDN lists `anchor()` as not animatable there.

Support: Chrome 131, Firefox 147, Safari 26. The limit is `anchor-scope`. The rest works from Chrome 125.

Measured in Chrome 150: the bar's computed left and width matched the active link to within 0.01px in three navs. After the attribute moved, the bar read 52.5px at 100ms and 107.67px at the end, the new link's own offset. A second nav on the page kept its bar in place. Raising the font size to 24px moved the bar to the new position with no script. With the scope removed and two indicators positioned against `body`, both sat under the second nav's active item.

- Evidence: `https://b.stripecdn.com/mkt-ssr-statics/assets/_next/static/css/c27cf5158235e02f.css`, loaded by stripe.com home. `.hds-side-nav{anchor-scope:--active-nav}` · `.hds-side-nav__link[aria-current]:not([aria-current=false]){anchor-name:--active-nav}` · `.hds-side-nav__list:after{inset-block-start:anchor(top);height:anchor-size(height);position-anchor:--active-nav}` · `transition:inset .25s ease` inside `prefers-reduced-motion: no-preference`.
- Not verified: none of the pages I fetched renders this side nav, so I saw the rules but not the component running on Stripe. Stripe's version is vertical and transitions only `inset`, so the bar's height would jump between items of different height. Mine transitions the size too.
- Docs: [MDN: anchor-name](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/anchor-name) · [MDN: anchor-scope](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/anchor-scope) · [MDN: anchor-size()](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/anchor-size)

## 2. Styles that apply only when a scroller overflows

Use it on any row that may or may not fit, such as tabs, a toolbar or a table wrapper. It fades the edges, shows a "more" control or changes the layout only when there is something to scroll to. It replaces a `ResizeObserver` that compares `scrollWidth` with `clientWidth`.

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
- Any value can go in the keyframes, including keywords. `--direction: row-reverse` with a default of `row` flips a flex row when it overflows.
- Write no fallback. Firefox has no scroll timelines, so the row scrolls there without the fade.

Support: `animation-timeline` in Chrome 115 and Safari 26. Firefox has it in Nightly only. Unprefixed `mask-image` in Chrome 120, Firefox 53, Safari 15.4.

Measured in Chrome 150: a 900px scroller whose content fits computed `--fade: 0px`. A 200px one with 311px of content computed `2rem` and a mask with 32px stops. Changing only the widths flipped both, and the value held at the end of the scroll. A child read the inherited value. With `animation-timeline` written before `animation`, an overflowing scroller computed `animation-timeline: auto` and `--fade: 0px`. In the second block the pair read 0px and 32px at the start, 32px and 32px in the middle, 32px and 0px at the end.

- Evidence: `https://b.stripecdn.com/mkt-ssr-statics/assets/_next/static/css/5abff0f798ddf7af.css`, stripe.com home. `@keyframes detect-scroll{0%,to{--can-scroll: }}` · `.navigation-menu{animation:detect-scroll linear;animation-timeline:scroll(inline self);--overflow-if-can-scroll:var(--can-scroll) hidden;overflow:var(--overflow-if-can-scroll,var(--overflow-if-cannot-scroll))}`.
- Seen live: at 1100px wide the English nav fits and computes `overflow-x: scroll` and `flex-direction: row`. On stripe.com/de the labels are longer, the nav's `scrollWidth` is 1070 against a `clientWidth` of 1064, and the same elements compute `hidden` and `row-reverse`. My inference is that Stripe uses it so longer translations adapt without a breakpoint per locale.
- Stripe stores an empty value and reads it through a fallback, `var(--can-scroll) hidden`. Setting real values in the keyframes gave the same result in my test with less to explain.
- The mask comes from `https://b.stripecdn.com/mkt-ssr-statics/assets/_next/static/css/763764aed97181e3.css`, stripe.com/billing: `mask-image:linear-gradient(to right,transparent 0,#000 var(--hds-space-core-250),#000 calc(100% - var(--hds-space-core-250)),transparent 100%)`. Stripe applies it through a `--scrollable` modifier class. I assume a script sets that class and did not check.
- Docs: [MDN: scroll()](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/animation-timeline/scroll) · Bramus Van Damme, [Detect if an element can scroll or not with only CSS](https://www.bram.us/2023/09/16/solved-by-css-scroll-driven-animations-detect-if-an-element-can-scroll-or-not/)

## 3. Transition a custom property with `@property`

Use it when one state change should drive several values together, or when a script feeds a number such as pointer position or progress into CSS and the result should ease.

```css
@property --progress {
  syntax: "<number>";
  inherits: true;
  initial-value: 0;
}

.card:focus-within { --progress: 1; }

@media (hover: hover) {
  .card:hover { --progress: 1; }
}

.card .icon { rotate: calc(var(--progress) * 90deg); }
.card .bar { scale: calc(0.25 + var(--progress) * 0.75) 1; }
.card .more { opacity: var(--progress); }

@media (prefers-reduced-motion: no-preference) {
  .card { transition: --progress 0.4s ease-out; }
}
```

Why it works:

- An unregistered custom property is a string, and a string cannot be interpolated. Registering it with a `syntax` gives it a type, and the browser then transitions it like any number.
- One transition with one easing drives every dependent value. The children derive theirs with `calc()`, so the parts stay in step.
- `inherits: true` passes the number down to the children that use it.

Rules:

- `initial-value` is required for every syntax except `"*"`.
- A registration is global. Register each name once and keep the names specific.
- A script only writes the variable, as in `el.style.setProperty("--x", "40%")`. The easing and duration stay in CSS.
- Other useful types are `<length-percentage>` for a gradient position and `<angle>` for a conic gradient.

Support: Chrome 85, Firefox 128, Safari 16.4.

Measured in Chrome 150: 100ms after focus entered the card the property read 0.32, the icon's `rotate` 28.8deg, the bar's `scale` 0.49 and the text's `opacity` 0.32. All reached their end values together. In a control with the same rules on an unregistered property, the property read 1 and the icon 90deg at 100ms.

- Evidence: `https://b.stripecdn.com/mkt-ssr-statics/assets/_next/static/css/e5be0f41b7fa7f3f.css`, stripe.com home. `@property --hover-progress{syntax:"<number>";initial-value:0;inherits:true}` · `--hover-boost:calc(var(--hover-progress)*.05)` · `transition:--hover-progress .6s cubic-bezier(.65,0,.35,1)`.
- Also `https://b.stripecdn.com/mkt-ssr-statics/assets/_next/static/css/960695345902a8e8.css`, stripe.com/contact/sales. `@property --gradient-border-mouse-x{syntax:"<length-percentage>";initial-value:50%;inherits:false}` with a 1s transition on it, read by `radial-gradient(… at var(--gradient-border-mouse-x) var(--gradient-border-mouse-y), …)`. I infer that a script writes the pointer position into the two properties. I did not read the script.
- Docs: [MDN: @property](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@property)

## 4. One `box-shadow` built from independent layers

Use it on inputs, buttons and cards that combine a hairline border, a focus ring and elevation. Each state sets its own layer and none of them overwrites another.

```css
@property --keyline {
  syntax: "*";
  inherits: false;
  initial-value: 0 0 0 0 transparent;
}

@property --ring {
  syntax: "*";
  inherits: false;
  initial-value: 0 0 0 0 transparent;
}

@property --elevation {
  syntax: "*";
  inherits: false;
  initial-value: 0 0 0 0 transparent;
}

.surface {
  box-shadow: var(--keyline), var(--ring), var(--elevation);
}

.field { --keyline: 0 0 0 1px oklch(0.8 0 0); }
.field:hover { --keyline: 0 0 0 1px oklch(0.6 0 0); }

.field:focus-visible {
  --ring: 0 0 0 4px oklch(0.7 0.15 250 / 0.5);
  outline: 2px solid transparent;
}

.raised { --elevation: 0 4px 12px oklch(0 0 0 / 0.15); }
```

Why it works:

- `box-shadow` is one property. A focus rule that writes a ring normally replaces the elevation. With one variable per layer, hover changes the keyline, focus adds the ring, and the elevation stays.
- `inherits: false` keeps a layer on the element that set it. An unregistered custom property inherits, so a card inside a focused card would draw the ring too.
- The `initial-value` gives every element a transparent zero-size shadow for each layer. Nothing has to reset the variables on `*`.
- A keyline drawn as a `0 0 0 1px` shadow takes no layout space. A bordered and a borderless variant are the same size.

Rules:

- Keep the transparent `outline` in the focus rule. Forced-colors mode removes `box-shadow` and repaints the outline. Entry 20 has the same rule.
- The first layer in the list paints on top.
- A browser without `@property` leaves the three variables undefined, and the whole `box-shadow` drops. Add fallbacks inside `var()` if a browser older than Firefox 128 matters.
- An inner keyline is `inset 0 0 0 1px`.

Support: Chrome 85, Firefox 128, Safari 16.4.

Measured in Chrome 150: with hover, keyboard focus and `.raised` together the element computed three live layers. A nested `.surface` that set nothing computed three transparent ones. The unregistered control, a plain `var(--k, 0 0 0 0 transparent)`, gave the nested element its parent's border and ring. With no registration and no fallback, `box-shadow: var(--a), var(--b)` computed `none`.

- Evidence: inline `<style>` on `https://docs.stripe.com/`. `box-shadow: var(--s--top-shadow), var(--s--keyline) 0 0 0 var(--s--keyline-width), var(--s--focus-ring), var(--s--box-shadow)` · `@property --s--focus-ring { inherits: false; syntax: "*"; initial-value: 0 0 0 0 transparent; }`.
- Seen live: 35 of the 87 visible links, buttons and inputs on the docs home computed a four-layer shadow. The search field's border is the `0px 0px 0px 1px` layer. A `--s--focus-ring` set on a parent read back as the initial value on its child.
- Docs: [MDN: @property](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@property) · [MDN: box-shadow](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/box-shadow)

## 5. Whole card clickable from one link

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

.card-link:focus-visible { outline: none; }

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
- `outline: none` on the link is safe only together with the `:has()` rule that draws the ring on the card.
- Text under the overlay cannot be selected. Accept it.
- Put hover styles on `.card:hover`, inside the query from entry 21.

Support: Chrome 105, Firefox 121, Safari 15.4.

Measured in Chrome 150: `elementFromPoint` at the card's corner and over the paragraph returned the link, and over the button returned the button. A click at the corner navigated. With keyboard focus on the link the card computed `outline: 2px solid` at a 2px offset and the link computed `outline-style: none`. The next Tab moved the ring to the button.

- Evidence: `https://b.stripecdn.com/mkt-ssr-statics/assets/_next/static/css/c27cf5158235e02f.css`. `.hds-resource-card:has(.hds-resource-card__link) .hds-resource-card__link{position:absolute;inset:0;z-index:2}` · `.hds-resource-card:has(.hds-resource-card__link:focus-visible){outline:var(--hds-focus-outline);outline-offset:var(--hds-focus-outline-offset)}`.
- Seen live on stripe.com/billing: the link's box and the card's box were both 400 by 215.5px.
- Stripe stretches the `<a>` itself and positions its label inside. I stretch the link's `::after`, which leaves the link text in the flow of the card. That form is from Heydon Pickering, [Cards](https://inclusive-components.design/cards/).

## 6. Reveal with `clip-path`

Use it for dropdowns, menus and panels that open over the page and whose height is not known. It unrolls the panel without animating `height`, and it works in every browser. The `interpolate-size` route in entry 4 is Chrome only.

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
      clip-path 0.25s ease-out,
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

Support: Chrome 55, Firefox 54, Safari 12.1.

Measured in Chrome 150: the computed clip went from `inset(0px -48px 100%)` through `inset(0px -48px calc(42.9% - 27.4px))` at 120ms to `inset(0px -48px -48px)`. The menu's box stayed 80px tall and the paragraph below stayed at the same offset through open and close. `elementFromPoint` over the first link returned the paragraph behind it while closed and the link once open. `visibility` stayed `visible` during the close and read `hidden` after it. A screenshot of the open menu shows the shadow on three sides and a flat top edge.

- Evidence: `https://b.stripecdn.com/mkt-ssr-statics/assets/_next/static/css/5abff0f798ddf7af.css`. `.hds-navigation-menu__popup{clip-path:inset(0 -60px 100% -60px round 0 0 var(--navigation-border-radius) var(--navigation-border-radius))}` · `.hds-navigation-menu__popup[data-status=open]{clip-path:inset(0 -60px -60px -60px round …)}`.
- Seen live on stripe.com: hovering "Products" set `data-status="open"`. The popup computed `inset(0px -60px calc(97.9974% - 1.20159px) round 0px 0px 6px 6px)` just after and `inset(0px -60px -60px round …)` once settled, with a 0.2s `clip-path` transition. Its height read 698px at both moments.
- Stripe sets the status attribute from a script. The `visibility` part is my addition.
- Docs: [MDN: inset()](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/basic-shape/inset)

## 7. Shadow change that fades and does not repaint

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

@media (hover: hover) {
  .card:hover::before { opacity: 0; }
  .card:hover::after { opacity: 1; }
}

@media (prefers-reduced-motion: no-preference) {
  .card::before,
  .card::after { transition: opacity 0.3s ease; }
}
```

Why it works:

- A `box-shadow` transition repaints the shadow on every frame. Each shadow here is painted once, and the transition changes only `opacity`, which the compositor handles.
- The two shadows cross-fade, so the end state is exactly the raised shadow and not the sum of both.
- `isolation: isolate` gives the card its own stacking context. `z-index: -1` then puts the pseudo-elements above the card's background and below its content.

Rules:

- The card needs its own background. The pseudo-elements have none.
- It uses both pseudo-elements of the card. Entry 27 uses `::after` for the hit area, so do not combine the two on one element.
- For a single small element, transition `box-shadow` directly. The saving below is real but small per card.

Support: every browser.

Measured in Chrome 150 with a DevTools trace over one change to the raised state and one back, 0.3s each, run twice. A class switched the same opacity rules so a script could drive the trace. The cross-fade produced 12 Paint events and 6 to 7 main-thread commits. A plain `box-shadow` transition between the same two shadows produced 76 to 80 Paint events and 38 to 40 commits. Total paint time for one card was about 0.2ms against about 2ms.

- Evidence: `https://b.stripecdn.com/mkt-ssr-statics/assets/_next/static/css/c27cf5158235e02f.css`. `.hds-resource-card:before{box-shadow:var(--hds-shadow-xs);opacity:1}` · `.hds-resource-card:after{box-shadow:var(--hds-shadow-md);opacity:0}` · `transition:opacity var(--hds-resource-card-duration) var(--hds-resource-card-easing)`.
- Seen live on stripe.com/billing: the card itself computed `box-shadow: none`. At rest `::before` had opacity 1 and `::after` 0. On hover they read 0 and 1.
- That Stripe does this for paint cost is my inference. The older form of the idea is Tobias Ahlin, [How to animate box-shadow](https://tobiasahlin.com/blog/how-to-animate-box-shadow/).

## 8. Label centered on its letters with `text-box`

Use it on single-line labels in buttons, badges and chips, so equal padding looks equal in any font.

```css
.button {
  display: inline-block;
  padding: 0.75rem 1.25rem;
  text-box: trim-both cap alphabetic;
}
```

Why it works:

- A line of text reserves space above the capitals and below the baseline, and the two amounts differ from font to font. Equal padding around that line puts the letters off-center.
- `trim-both cap alphabetic` cuts the box down to the cap height and the baseline. The padding then starts at the letters.
- A font swap or a fallback font no longer moves the label.

Rules:

- It does nothing on a flex or grid container. A button that is `inline-flex` because it holds an icon needs the declaration on the element that wraps the text.
- The padding now starts at the letters, so the button gets shorter. Raise the padding to keep the same height.
- Use it for one line. Descenders hang into the bottom padding, which is the intent.
- Do not set it on `*`. `PRACTICES.md` already lists that under "Left out on purpose". The scoped form went into `PRACTICES.md` as entry 33 later the same day.
- Write no fallback. Without support the label has its normal line box.

Support: Chrome 133, Firefox 154, Safari 18.2.

Measured in Chrome 150 at 16px with 12px padding in eight fonts. Untrimmed, the space above the capitals and below the baseline ranged from equal to 1.7px apart. Menlo read 17.3px above and 19px below, Avenir Next 17.7px and 19px. Trimmed, every font read 12.0px above and 12px below, and the button went from 48px tall to about 35px. On an `inline-flex` button the declaration changed nothing and the height stayed 48px. On a `span` inside that button it trimmed as on the block.

- Evidence: `https://b.stripecdn.com/mkt-ssr-statics/assets/_next/static/css/c27cf5158235e02f.css`. `.hds-button{display:inline-flex;align-items:center;text-box:trim-both cap alphabetic;…}` next to `--hds-button-padding-block-start:15.5px;--hds-button-padding-block-end:16.5px`.
- Weak evidence, stated plainly: on stripe.com I switched `text-box` off on 13 visible `.hds-button` elements and no height changed. "Get started" stayed 48px, which is 15.5 + 16 + 16.5. The button is a flex container, so in Chrome 150 the declaration is inert and the uneven padding does the centering. I infer the intent from the declaration. The snippet above is the form that worked in my test.
- Docs: [MDN: text-box](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/text-box)

## Looked at and rejected

Covered by an existing entry:

- **Accordion.** `::details-content` with `transition-behavior: allow-discrete` and an `@supports (interpolate-size: allow-keywords)` branch. Same as entry 4. Stripe adds a script-set `--content-height` for other browsers.
- **Hover gating.** `(hover: hover)` and `(pointer: fine)` around hover rules. Entry 21. The older system pairs `@media (pointer: fine) { :hover }` with `@media (pointer: coarse) { :active }` so touch gets the same style as a pressed state. Entry 31 in `PRACTICES.md` is press feedback, added after this research started.
- **Reduced motion.** The home page has 55 `no-preference` queries against 12 `reduce`. Entry 22. Stripe also sets duration tokens to `0s` and gives them a value inside the query, a token-level form of the same rule.
- **Focus.** `outline: 3px solid` in a translucent brand color with a 3px offset, on `:focus-visible`. Entry 20. The older system draws a two-tone ring with `box-shadow` under a script-set `.keyboard-navigation` class, which `:focus-visible` replaced.
- **Tabular numbers.** `font-variant-numeric: tabular-nums` with a `"tnum"` feature fallback. Entry 28. One addition worth a line there is a tight variant with `letter-spacing: -0.03em` for large figures.
- **Container queries, subgrid, logical properties, scroll snap, `overflow: clip`, `scrollbar-gutter`, `html:has(…)` scroll lock.** All present, all in entries 9, 12, 13, 16, 17 and 18.
- **Popover placement.** `anchor()` on a positioner whose side and alignment come from script-set data attributes. Entry 26 does it with no script.

Not a technique at the level of properties and values:

- **Cascade layers.** `@layer reset, base, app`, with `:where()` used 109 times to keep selectors at zero specificity. It is how the new system lets a page override a component without a specificity fight. It is stylesheet architecture, and Tailwind and StyleX each manage the cascade their own way.
- **The layout grid.** New system: 4, 8 and 12 columns with span tokens such as `--hds-canary-grid-span-half` that change at breakpoints, plus subgrid. Old system: `--columnWidth: calc(var(--layoutWidth) / var(--columnCountMax))` over a `--windowWidth` that subtracts a script-measured scrollbar. Entry 1 does the job with no script and no breakpoints.
- **Type and spacing scale.** Every step is a bundle of size, line height, letter spacing and weight tokens in `rem`, redeclared at 640px and 940px. On the home page `clamp()` appears five times, for progress numbers, a dialog margin and a carousel card width. The only fluid font sizes I found are the hero title, written as `max(min(…), …)` with bounds per language, and three graphics that use `min(token, 2.1vw)`. The rest is a breakpoint ladder, which entry 7 replaces.

Brand design, or behind the list already:

- **Color.** Hex tokens only. No `oklch()`, no `light-dark()`, no `prefers-color-scheme`. Dark sections use a `.hds-mode--dark` class that redeclares the tokens, and `color-mix()` runs in sRGB. Entries 2 and 8 are ahead of it.
- **Shadow tokens.** Each elevation is two layers, a tight one and a wide one, in a blue-tinted alpha color, with negative spread on the large sizes. Dark mode swaps only the colors. Sound, but it is their look.
- **Easing.** `cubic-bezier(0.25, 1, 0.5, 1)` 61 times and `cubic-bezier(0.65, 0, 0.35, 1)` 34 times across the files. No `linear()`. Entry 30 in `PRACTICES.md` has motion tokens.
- **Gradient border and spinner.** `mask-composite: exclude` over a conic gradient driven by an `<angle>` property. Decoration. The reusable part is candidate 3.
- **Card that grows on hover.** An oversized inner layer whose `clip-path: inset()` animates to zero. A one-off effect. The mechanism is candidate 6.

Too narrow or too fragile:

- **Bottom-sheet dialog.** A scroll-snap container with a named scroll timeline and `timeline-scope`, so the overlay fades as the sheet is dragged down. It still needs a script to close, and Firefox has no scroll timelines. It fits the scroll-driven item under "Next".
- **`:lang()` type overrides.** `:where(:lang(ja))` rules set `font-weight: 600` with `font-variation-settings: "wght" 400`. My inference is that this holds the Latin variable font at 400 while the system Japanese fallback renders at 600. Specific to their font.
- **`@font-face` inside `@media`.** `font-display: block` from 600px and `swap` below. A narrow loading decision.
- **Real superscripts.** `sup { font-feature-settings: "sups" 1; font-size: 1em; top: 0 }`. Works only when the font has the glyphs.
- **Half-pixel nudges.** `@media (min-resolution: 2x)` with `padding-top: 11.5px; padding-bottom: 12.5px`. Hand-tuned centering. Candidate 8 is the general answer.
- **Per-browser color patches.** The hero title's color is overridden inside `@media (color-gamut: p3)`, `@-moz-document url-prefix()` and `@supports (-webkit-touch-callout: none)`. Browser sniffing.
- **Sail's support test.** `@supports ((content-visibility: auto) and (text-size-adjust: auto)) or (margin-trim: none)` stands in for "has `@property`", with a `*, ::before, ::after` reset as the other branch. Not needed since Firefox 128.
- **Sail's font-metric tokens.** `--s--cap-height`, `--s--ascender` and others, used to trim and align text by hand. Candidate 8 is the native form.
- **`text-rendering: optimizeLegibility`** in the reset. `PRACTICES.md` leaves it out on purpose.

Two mistakes in Stripe's CSS that support rules the list already has:

- `@media (prefers-reduced-motion: reduced)` appears in the inline styles of stripe.com/payments and stripe.com/pricing. `reduced` is not a valid value, so the rule never applies and the mobile menu keeps its motion. Opt-in motion, as in entry 22, cannot fail this way.
- The `text-box` declaration on `.hds-button` does nothing, as candidate 8 describes.
