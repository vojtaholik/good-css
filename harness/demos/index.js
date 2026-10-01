const files = import.meta.glob("./*.html", { query: "?raw", import: "default", eager: true });

/* One fixture per entry. The file is named after the slug of the entry's
   title in PRACTICES.md, and that name is the only link between the two.

   A fixture is the markup an entry's CSS needs to show itself, plus
   cosmetics. It never restates the technique. It opens with

     <template data-specimen data-height="400">What a pass looks like.</template>

   where the height is the frame's starting height in px. A specimen that
   needs more in its viewport meta tag adds data-viewport="viewport-fit=cover". */
const header = /<template data-specimen([^>]*)>([\s\S]*?)<\/template>/;
const attribute = /data-([a-z]+)="([^"]*)"/g;

function readFixture(html) {
  const [, attributes, check] = html.match(header);
  const { height, viewport } = Object.fromEntries(
    [...attributes.matchAll(attribute)].map(([, name, value]) => [name, value]),
  );

  return { html, height: Number(height), viewport, check: check.trim() };
}

export const demos = Object.fromEntries(
  Object.entries(files).map(([path, html]) => [path.slice(2, -5), readFixture(html)]),
);
