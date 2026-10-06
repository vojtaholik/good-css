import { marked } from "marked";
import { author, authorProfile, origin, repository } from "./site.js";

const attribute = (value) => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");

/* The command that installs the skill, with the button that copies it. The
   prompt sign is drawn in CSS, so a copy takes the command alone. */
export const installCommand = `<div class="install-command">
          <code>npx skills@latest add vojtaholik/good-css</code>
          <button type="button" aria-live="polite" data-copy>
            <span class="icon icon-copy"></span>
            <span data-copy-label>Copy</span>
          </button>
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
        <a class="mark" href="/" aria-label="good-css"></a>
        ${nav}
        <a class="pill github" href="${repository}">
          <span class="icon icon-github"></span>
          <span class="github-label">GitHub</span>
        </a>
        <button class="pill pill-filled" type="button" popovertarget="install">Install</button>
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

/* What ends every page: the install command again, the site's links in four
   columns, and the wordmark cut by the bottom of the window. On the index
   main.js puts the drawing of each category beside the command. */
export const footer = `<footer class="site-footer band band-slate content-grid">
      <div class="footer-top">
        <section class="footer-install" aria-labelledby="footer-install-title">
          <span class="mark" aria-hidden="true"></span>
          <h2 id="footer-install-title">Install it as an agent skill</h2>
          <p>
            For Claude Code, Codex, Cursor and any other agent that reads skills. The source and the
            other ways to install are on <a href="${repository}">GitHub</a>.
          </p>
          ${installCommand}
        </section>
        <div class="footer-art" data-slot="footer-art" aria-hidden="true"></div>
      </div>

      <nav class="footer-links" aria-label="Site">
        <div>
          <p class="label">Site</p>
          <a href="/">good-css</a>
          <a href="/about">About</a>
          <a href="/contact">Contact</a>
          <a href="/privacy">Privacy</a>
        </div>
        <div>
          <p class="label">For agents</p>
          <a href="/llms.txt">llms.txt</a>
        </div>
        <div>
          <p class="label">Source</p>
          <a class="with-icon" href="${repository}">GitHub<span class="icon icon-out"></span></a>
          <a class="footer-soft" href="${repository}/blob/main/LICENSE">MIT License</a>
        </div>
        <div>
          <p class="label">Made by</p>
          <a class="with-icon" href="${authorProfile}">${author}<span class="icon icon-out"></span></a>
        </div>
      </nav>

      <div class="footer-end">
        <p class="label">© ${new Date().getFullYear()} ${author}</p>
        <p>From experts for agents.</p>
      </div>

      <div class="footer-wordmark" aria-hidden="true"></div>
    </footer>

    <script type="module">
      /* A copy button copies the command beside it and says so for a moment. */
      for (const button of document.querySelectorAll("[data-copy]")) {
        const label = button.querySelector("[data-copy-label]");

        button.addEventListener("click", async () => {
          await navigator.clipboard.writeText(button.previousElementSibling.textContent);
          label.textContent = "Copied";
          setTimeout(() => (label.textContent = "Copy"), 1500);
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

    <main class="page band band-tint content-grid">
      <h1>${page.title}</h1>
      <p class="page-statement">${marked.parseInline(page.statement)}</p>
      <div class="prose">${marked.parser(page.body)}</div>
    </main>

    ${footer}
  </body>
</html>
`;
}
