import { marked } from "marked";
import { author, authorProfile, origin } from "./site.js";

const attribute = (value) => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");

/* What ends every page: who made it, then the site's links, kept quiet. */
export const footer = `<footer class="footer content-grid">
      <div class="footer-row">
        <p>Made by <a href="${authorProfile}">${author}</a></p>
        <nav aria-label="Site">
          <a href="/">good-css</a>
          <a href="/about">About</a>
          <a href="/contact">Contact</a>
          <a href="/privacy">Privacy</a>
          <a href="/llms.txt">llms.txt</a>
        </nav>
      </div>
    </footer>`;

/* A page in deploy/pages: the heading is its title, the first paragraph its
   statement, the rest its body. */
export function readPage(markdown) {
  const [heading, statement, ...body] = marked.lexer(markdown).filter((token) => token.type !== "space");

  return { title: heading.text, statement: statement.text, body };
}

/* Draws a page with the masthead of the index. A page with no path, the one for a missing page,
   gets no canonical URL and no Markdown twin. */
export function sitePage({ page, stylesheet, path }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${page.title} · good-css</title>
    <meta name="description" content="${attribute(page.statement)}">
    ${
      path
        ? `<link rel="canonical" href="${origin}${path}">
    <link rel="alternate" type="text/markdown" href="${path}.md">`
        : `<meta name="robots" content="noindex">`
    }
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="${stylesheet}">
  </head>
  <body>
    <div class="guides content-grid" aria-hidden="true">
      <i class="breakout"></i>
      <i></i>
    </div>

    <main class="masthead content-grid">
      <h1>${page.title}</h1>

      <div class="masthead-body">
        <p class="masthead-statement">${marked.parseInline(page.statement)}</p>
        <div class="prose">${marked.parser(page.body)}</div>
      </div>
    </main>

    ${footer}
  </body>
</html>
`;
}
