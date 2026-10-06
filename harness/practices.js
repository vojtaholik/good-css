import { marked } from "marked";
import source from "../PRACTICES.md?raw";

const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const codeBlocks = (tokens, lang) =>
  tokens.filter((token) => token.type === "code" && token.lang === lang).map((token) => token.text);

const capitalize = (html) => html.replace(/^[a-z]/, (letter) => letter.toUpperCase());

/* The code of an entry, block by block, with any text between the blocks. */
const readSource = (tokens) =>
  tokens.map((token) =>
    token.type === "code" ? { lang: token.lang, text: token.text } : { html: marked.parser([token]) },
  );

/* A support line that opens with versions, such as "Chrome 120, Firefox
   118, Safari 15.4", gives one version per browser. What follows the
   versions is kept as text. A line that names no versions is all text. */
const versions = /^((?:Chrome|Firefox|Safari) \d+(?:\.\d+)*(?:, (?:Chrome|Firefox|Safari) \d+(?:\.\d+)*)*)/;

function readSupport(text) {
  const line = text.replace(/^Support: /, "");
  const [listed = ""] = line.match(versions) ?? [];
  const browsers = Object.fromEntries(listed.split(", ").filter(Boolean).map((pair) => pair.split(" ")));
  const rest = line.slice(listed.length).replace(/^[,.]\s*/, "");

  return {
    browsers: ["Chrome", "Firefox", "Safari"].filter((name) => browsers[name]).map((name) => ({ name, version: browsers[name] })),
    html: capitalize(marked.parseInline(rest)),
  };
}

/* Everything from "Why it works:" on, sorted into its parts: the reasons,
   the rules, the support line, the credits, and any other labelled line,
   such as "In other systems:". A credit is a list item that opens with its
   kind, and it may share a list with the rules. */
const credit = /^(Borrowed from|Background|Docs):\s*/;

function readNotes(tokens) {
  const notes = { reasons: [], rules: [], support: null, other: [], credits: [] };
  let list = null;

  for (const token of tokens) {
    if (token.type === "paragraph" && token.text === "Why it works:") list = notes.reasons;
    else if (token.type === "paragraph" && token.text === "Rules:") list = notes.rules;
    else if (token.type === "paragraph" && token.text.startsWith("Support:")) notes.support = readSupport(token.text);
    else if (token.type === "list") {
      for (const item of token.items) {
        const [, kind] = item.text.match(credit) ?? [];

        const html = marked.parseInline(item.text.replace(credit, ""));

        if (kind) notes.credits.push({ kind, html });
        else if (list) list.push(html);
        else notes.other.push({ label: "", html });
      }
      list = null;
    } else if (token.type === "paragraph") {
      const [, label = "", text] = token.text.match(/^(?:([A-Z][^:.]{0,40}):\s*)?([\s\S]*)$/);
      notes.other.push({ label, html: capitalize(marked.parseInline(text)) });
    }
  }

  return notes;
}

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
    source: readSource(body.slice(hasLede ? 1 : 0, notesStart)),
    notes: readNotes(body.slice(notesStart)),
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
