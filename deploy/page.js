import { marked } from "marked";
import { author, authorProfile, origin, repository } from "./site.js";

const attribute = (value) => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");

/* The command that installs the skill, with the button that copies it. The
   prompt sign is drawn in CSS, so a copy takes the command alone. */
export const installCommand = `<div class="install-command">
          <code>npx skills@latest add vojtaholik/good-css</code>
          <button type="button" aria-live="polite" data-copy>Copy</button>
        </div>`;

/* What the index adds to the header on a narrow screen: the category the
   reader is in, as a button that opens the list of all of them. main.js fills
   both from the categories of PRACTICES.md. Until a category is in view the
   button says "Categories". */
export const categoryNav = `<button class="current" type="button" popovertarget="category-menu">
          <span class="current-names" data-slot="category-names">
            <span style="animation-timeline: --in-categories">Categories</span>
          </span>
        </button>
        <nav class="menu" id="category-menu" popover aria-label="Categories">
          <ol data-slot="category-menu"></ol>
        </nav>`;

/* What opens every page: the mark, the link to the source, and the button
   that opens the install command in a popover. */
export const header = (nav = "") => `<header class="site-header content-grid">
      <div class="site-header-bar">
        <a class="mark" href="/" aria-label="good-css">
          <img src="/mark.svg" alt="" width="83" height="78">
        </a>
        ${nav}
        <a class="github" href="${repository}">
          <span class="icon"><img src="/icons/github.svg" alt=""></span>
          <span class="github-label">GitHub</span>
        </a>
        <button class="button" type="button" popovertarget="install">Install</button>
      </div>

      <div class="install" id="install" popover>
        <p class="install-title">Install it as an agent skill</p>
        ${installCommand}
        <p>
          For Claude Code, Codex, Cursor and any other agent that reads skills. The source and the
          other ways to install are on <a href="${repository}">GitHub</a>.
        </p>
      </div>
    </header>`;

/* What ends every page: who made it, then the site's links. The script is
   here because every page has a copy button, in the popover of the header. */
export const footer = `<footer class="site-footer content-grid">
      <div class="site-footer-row">
        <p>Made by <a href="${authorProfile}">${author}</a></p>
        <nav aria-label="Site">
          <a href="/">good-css</a>
          <a href="/about">About</a>
          <a href="/contact">Contact</a>
          <a href="/privacy">Privacy</a>
          <a href="/llms.txt">llms.txt</a>
          <a href="${repository}">GitHub</a>
        </nav>
      </div>
    </footer>

    <script type="module">
      /* A copy button copies the command beside it and says so for a moment. */
      for (const button of document.querySelectorAll("[data-copy]")) {
        button.addEventListener("click", async () => {
          await navigator.clipboard.writeText(button.previousElementSibling.textContent);
          button.textContent = "Copied";
          setTimeout(() => (button.textContent = "Copy"), 1500);
        });
      }
    </script>`;

/* A page in deploy/pages: the heading is its title, the first paragraph its
   statement, the rest its body. */
export function readPage(markdown) {
  const [heading, statement, ...body] = marked.lexer(markdown).filter((token) => token.type !== "space");

  return { title: heading.text, statement: statement.text, body };
}

/* Draws a page between the header and the footer of the index. A page with no
   path, the one for a missing page, gets no canonical URL and no Markdown twin. */
export function sitePage({ page, stylesheets, path }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>${page.title} · good-css</title>
    <meta name="description" content="${attribute(page.statement)}">
    ${
      path
        ? `<link rel="canonical" href="${origin}${path}">
    <link rel="alternate" type="text/markdown" href="${path}.md">`
        : `<meta name="robots" content="noindex">`
    }
    <link rel="icon" href="/mark.svg" type="image/svg+xml">
    <link rel="preload" href="/fonts/Inter-Variable.woff2" as="font" type="font/woff2" crossorigin>
    ${stylesheets.map((href) => `<link rel="stylesheet" href="${href}">`).join("\n    ")}
  </head>
  <body>
    ${header()}

    <main class="page content-grid">
      <h1>${page.title}</h1>
      <p class="page-statement">${marked.parseInline(page.statement)}</p>
      <div class="prose">${marked.parser(page.body)}</div>
    </main>

    ${footer}
  </body>
</html>
`;
}
