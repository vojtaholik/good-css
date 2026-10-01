import tokens from "./tokens.css?raw";
import base from "./demos/base.css?raw";
import { readPractices } from "./practices.js";
import { demos } from "./demos/index.js";

/* Builds the standalone page a specimen runs in, served at /specimen/<slug>.

   The entry's code blocks go in verbatim: its CSS unlayered, its HTML at
   every `<!-- html -->` in the fixture, its JS as a module at the end of
   body. Everything the fixture adds is in a cascade layer, so the entry's
   CSS wins wherever the two touch the same property. */
export function specimenPage(slug) {
  const entry = readPractices().entries.find((entry) => entry.slug === slug);
  const demo = demos[slug];

  if (!entry || !demo) return null;

  const viewport = ["width=device-width", "initial-scale=1", demo.viewport].filter(Boolean).join(", ");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="${viewport}">
<title>${entry.number}. ${entry.slug}</title>
<style>
${tokens}
${base}
</style>
<style data-source="PRACTICES.md">
${entry.code.css.join("\n\n")}
</style>
</head>
<body>
${demo.html.replaceAll("<!-- html -->", entry.code.html.join("\n"))}
<script type="module">
${entry.code.js.join("\n\n")}
</script>
</body>
</html>`;
}
