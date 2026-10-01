import { marked } from "marked";
import source from "../PRACTICES.md?raw";

const numbered = /^(\d+)\.\s+(.+)$/;

const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const codeBlocks = (tokens, lang) =>
  tokens.filter((token) => token.type === "code" && token.lang === lang).map((token) => token.text);

function readEntry({ heading, body }) {
  const [, number, title] = heading.text.match(numbered);
  const hasLede = body[0]?.type === "paragraph";

  return {
    number: Number(number),
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
   gets a specimen. Any other `##` section is about the list, for the people
   who keep it, and is not shown. */
export function readPractices() {
  const intro = [];
  const sections = [];

  for (const token of marked.lexer(source)) {
    if (token.type === "space") continue;
    if (token.type === "heading" && token.depth === 2) sections.push({ heading: token, body: [] });
    else (sections.at(-1)?.body ?? intro).push(token);
  }

  const [statement, ...rest] = intro.filter((token) => token.type !== "heading");

  return {
    title: intro.find((token) => token.type === "heading")?.text ?? "",
    statement: statement ? marked.parseInline(statement.text) : "",
    intro: marked.parser(rest),
    entries: sections.filter(({ heading }) => numbered.test(heading.text)).map(readEntry),
  };
}
