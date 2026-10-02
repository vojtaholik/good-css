import { Marked } from "marked";
import source from "../PRACTICES.md?raw";
import { categories } from "../categories.js";

const numbered = /^(\d+)\.\s+(.+)$/;

/* The page lists the entries by category and shows no numbers, so "entry 4" in
   running text is a link to that entry, with its title as the tooltip. What a
   number points to is known once every heading is read, before any text is
   rendered. */
const numberedEntries = new Map();

const attribute = (value) => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");

const marked = new Marked({
  extensions: [
    {
      name: "entryLink",
      level: "inline",
      start: (text) => text.match(/\b[Ee]ntry \d/)?.index,
      tokenizer(text) {
        const match = /^[Ee]ntry (\d+)\b/.exec(text);
        if (match) return { type: "entryLink", raw: match[0], number: Number(match[1]) };
      },
      renderer({ raw, number }) {
        const entry = numberedEntries.get(number);
        return entry ? `<a href="#${entry.slug}" title="${attribute(entry.title)}">${raw}</a>` : raw;
      },
    },
  ],
});

const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const codeBlocks = (tokens, lang) =>
  tokens.filter((token) => token.type === "code" && token.lang === lang).map((token) => token.text);

/* An entry reads: when to use it, the code, then "Why it works:" and all
   that follows. `source` is the code with any text between its blocks, and
   `notes` is the rest. */
function readEntry({ heading, body }) {
  const [, number, title] = heading.text.match(numbered);
  const hasLede = body[0]?.type === "paragraph";
  const why = body.findIndex((token) => token.type === "paragraph" && token.text === "Why it works:");
  const notesStart = why === -1 ? body.length : why;

  return {
    number: Number(number),
    title: marked.parseInline(title),
    slug: slugify(title),
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

/* PRACTICES.md is the only source. A numbered `##` section is an entry and
   gets a specimen. Any other `##` section is about the list, for the people
   who keep it, and is not shown. `entries` has them in the order of the
   file, and `categories` in the order and groups of categories.js. */
export function readPractices() {
  const intro = [];
  const sections = [];

  for (const token of marked.lexer(source)) {
    if (token.type === "space") continue;
    if (token.type === "heading" && token.depth === 2) sections.push({ heading: token, body: [] });
    else (sections.at(-1)?.body ?? intro).push(token);
  }

  const [statement, ...rest] = intro.filter((token) => token.type !== "heading");
  const numberedSections = sections.filter(({ heading }) => numbered.test(heading.text));

  for (const { heading } of numberedSections) {
    const [, number, title] = heading.text.match(numbered);
    numberedEntries.set(Number(number), { slug: slugify(title), title: title.replaceAll("`", "") });
  }

  const entries = numberedSections.map(readEntry);
  const bySlug = Object.fromEntries(entries.map((entry) => [entry.slug, entry]));

  return {
    title: intro.find((token) => token.type === "heading")?.text ?? "",
    statement: statement ? marked.parseInline(statement.text) : "",
    intro: marked.parser(rest),
    entries,
    categories: categories.map(({ title, entries }) => ({
      title,
      slug: slugify(title),
      entries: entries.map((slug) => bySlug[slug]),
    })),
  };
}
