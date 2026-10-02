import { marked } from "marked";
import source from "../PRACTICES.md?raw";

const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const codeBlocks = (tokens, lang) =>
  tokens.filter((token) => token.type === "code" && token.lang === lang).map((token) => token.text);

/* An entry reads: when to use it, the code, then "Why it works:" and all
   that follows. `source` is the code with any text between its blocks, and
   `notes` is the rest. `number` is the entry's place in its category. */
function readEntry({ heading, body }, index) {
  const hasLede = body[0]?.type === "paragraph";
  const why = body.findIndex((token) => token.type === "paragraph" && token.text === "Why it works:");
  const notesStart = why === -1 ? body.length : why;

  return {
    number: index + 1,
    title: marked.parseInline(heading.text),
    slug: slugify(heading.text),
    lede: hasLede ? marked.parseInline(body[0].text) : "",
    source: marked.parser(body.slice(hasLede ? 1 : 0, notesStart)),
    notes: marked.parser(body.slice(notesStart)),
    code: {
      css: codeBlocks(body, "css"),
      html: codeBlocks(body, "html"),
      js: codeBlocks(body, "js"),
    },
  };
}

/* PRACTICES.md is the only source. A `##` section with `###` sections under
   it is a category, and each `###` is an entry and gets a specimen. Any other
   `##` section is about the list, for the people who keep it, and is not
   shown. An entry names another one with a link to its heading, such as
   `[The reset](#the-reset)`, and an entry sits on the page under the same
   slug, so the link needs no help. `entries` has every entry in the order of
   the file. */
export function readPractices() {
  const intro = [];
  const sections = [];

  for (const token of marked.lexer(source)) {
    if (token.type === "space") continue;

    const section = sections.at(-1);
    if (token.type === "heading" && token.depth === 2) sections.push({ heading: token, entries: [] });
    else if (token.type === "heading" && token.depth === 3 && section) section.entries.push({ heading: token, body: [] });
    else (section ? section.entries.at(-1)?.body : intro)?.push(token);
  }

  const [statement, ...rest] = intro.filter((token) => token.type !== "heading");
  const categories = sections
    .filter((section) => section.entries.length)
    .map(({ heading, entries }) => ({
      title: heading.text,
      slug: slugify(heading.text),
      entries: entries.map(readEntry),
    }));

  return {
    title: intro.find((token) => token.type === "heading")?.text ?? "",
    statement: statement ? marked.parseInline(statement.text) : "",
    intro: marked.parser(rest),
    entries: categories.flatMap((category) => category.entries),
    categories,
  };
}
