import { marked } from "marked";
import source from "../PRACTICES.md?raw";

const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const codeBlocks = (tokens, lang) =>
  tokens.filter((token) => token.type === "code" && token.lang === lang).map((token) => token.text);

function readSection({ heading, body }) {
  const numbered = heading.text.match(/^(\d+)\.\s+(.+)$/);
  const title = numbered ? numbered[2] : heading.text;
  const hasLede = body[0]?.type === "paragraph";

  return {
    number: numbered ? Number(numbered[1]) : null,
    title: marked.parseInline(title),
    slug: slugify(title),
    lede: hasLede ? marked.parseInline(body[0].text) : "",
    body: marked.parser(hasLede ? body.slice(1) : body),
    code: {
      css: codeBlocks(body, "css"),
      html: codeBlocks(body, "html"),
      js: codeBlocks(body, "js"),
    },
  };
}

/* PRACTICES.md is the only source. A numbered `##` section is an entry and
   gets a specimen. Any other `##` section is a note and is shown as text. */
export function readPractices() {
  const intro = [];
  const sections = [];

  for (const token of marked.lexer(source)) {
    if (token.type === "space") continue;
    if (token.type === "heading" && token.depth === 2) sections.push({ heading: token, body: [] });
    else (sections.at(-1)?.body ?? intro).push(token);
  }

  const all = sections.map(readSection);
  const [statement, ...rest] = intro.filter((token) => token.type !== "heading");

  return {
    title: intro.find((token) => token.type === "heading")?.text ?? "",
    statement: statement ? marked.parseInline(statement.text) : "",
    intro: marked.parser(rest),
    entries: all.filter((section) => section.number !== null),
    notes: all.filter((section) => section.number === null),
  };
}
