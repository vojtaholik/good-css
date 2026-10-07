import { copyFile, cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Window } from "happy-dom";
import { build, createServer } from "vite";
import { marked } from "marked";
import { frontmatter, llmsTxt, robots, sitemap, sitemapUrls } from "./agent-files.js";
import { readPage, sitePage } from "./page.js";
import { author, origin, pages, published } from "./site.js";

/* Builds the harness into dist/ as a static site: the index with its content
   already in the HTML, one page per specimen at /specimen/<slug>, the pages
   in deploy/pages, the skill, and the files an agent looks for.

   A push to main deploys it. vercel.json has Vercel run `bun run build` and
   serve dist/, and holds the rules that answer a request for Markdown with
   Markdown. The dev server is untouched. */
const root = join(import.meta.dirname, "..");
const dist = join(root, "dist");
const cacheDir = join(root, "node_modules/.vite-build");

/* The "- Source:" lines of PRACTICES.md hold local file paths, so the build
   reads the file without them. */
const source = (await readFile(join(root, "PRACTICES.md"), "utf8")).replace(/^- Source:.*\n/gm, "");

/* The site publishes the opening of PRACTICES.md and its categories. A `##`
   section with `###` sections under it is a category, and each `###` is an
   entry. Any other `##` section is about the list, for the people who keep
   it, and is left out. practices.js reads the file by the same headings. */
const opening = [];
const sections = [];
let section = opening;

for (const token of marked.lexer(source)) {
  if (token.type === "heading" && token.depth === 2) sections.push((section = []));
  section.push(token);
}

const isEntry = (token) => token.type === "heading" && token.depth === 3;
const raw = (tokens) => tokens.map((token) => token.raw).join("").trim() + "\n";
const categorySections = sections.filter((tokens) => tokens.some(isEntry));

/* Each entry as Markdown, in the order of the entries. */
const entryMarkdown = categorySections.flatMap((tokens) => {
  const starts = tokens.flatMap((token, index) => (isEntry(token) ? [index] : []));
  return starts.map((start, index) => raw(tokens.slice(start, starts[index + 1])));
});

/* This is the only copy of the file the site is built from, so what it leaves
   out reaches nothing public. */
const practicesMarkdown = [raw(opening), ...categorySections.map(raw)].join("\n");

const publicPractices = () => ({
  name: "public-practices",
  enforce: "pre",
  load(id) {
    if (id.endsWith("PRACTICES.md?raw")) return `export default ${JSON.stringify(practicesMarkdown)}`;
  },
});

/* Loads the harness modules the way the dev server does, so the build runs
   the same practices.js, frame.js and main.js. */
const server = await createServer({
  plugins: [publicPractices()],
  cacheDir,
  optimizeDeps: { noDiscovery: true },
  server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  appType: "custom",
  logLevel: "warn",
});

const { readPractices } = await server.ssrLoadModule("/practices.js");
const { specimenPage } = await server.ssrLoadModule("/frame.js");
const { demos } = await server.ssrLoadModule("/demos/index.js");

const practices = readPractices();
const window = new Window({
  url: origin,
  settings: {
    disableJavaScriptFileLoading: true,
    disableCSSFileLoading: true,
    navigation: { disableChildFrameNavigation: true },
  },
});

/* Titles and ledes are HTML from marked. The files for agents want text. */
function text(html) {
  const node = window.document.createElement("div");
  node.innerHTML = html;
  return node.textContent.trim();
}

const firstSentence = (value) => value.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? value;

const today = new Date().toISOString().slice(0, 10);
const description = text(practices.statement);
const entries = practices.entries.map((entry) => ({
  slug: entry.slug,
  title: text(entry.title),
  lede: firstSentence(text(entry.lede)),
  markdown: `${origin}/specimen/${entry.slug}.md`,
  specimen: demos[entry.slug] ? `${origin}/specimen/${entry.slug}` : null,
}));

/* The same entries by category, in the order the page shows them. */
const bySlug = Object.fromEntries(entries.map((entry) => [entry.slug, entry]));
const categories = practices.categories.map((category) => ({
  title: category.title,
  entries: category.entries.map((entry) => bySlug[entry.slug]),
}));

const person = { "@type": "Person", name: author, url: `${origin}/about` };

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  name: practices.title,
  headline: `${practices.title}: ${entries.length} modern CSS techniques, each with a live specimen`,
  description,
  url: `${origin}/`,
  image: `${origin}/og.png`,
  inLanguage: "en",
  datePublished: published,
  dateModified: today,
  author: person,
  publisher: person,
  about: ["CSS", "Web design", "Front-end development"],
  isPartOf: { "@type": "WebSite", name: practices.title, url: `${origin}/` },
  encoding: { "@type": "MediaObject", encodingFormat: "text/markdown", contentUrl: `${origin}/index.md` },
  mainEntity: {
    "@type": "ItemList",
    numberOfItems: entries.length,
    itemListElement: categories
      .flatMap((category) => category.entries)
      .map((entry, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: entry.title,
        url: `${origin}/#${entry.slug}`,
      })),
  },
};

const head = () => ({
  name: "head",
  transformIndexHtml: () =>
    [
      { tag: "meta", attrs: { name: "description", content: description } },
      { tag: "meta", attrs: { name: "author", content: author } },
      { tag: "link", attrs: { rel: "canonical", href: `${origin}/` } },
      { tag: "link", attrs: { rel: "alternate", type: "text/markdown", href: "/index.md", title: "The whole list as Markdown" } },
      { tag: "link", attrs: { rel: "alternate", type: "text/plain", href: "/llms.txt", title: "llms.txt" } },
      { tag: "link", attrs: { rel: "sitemap", type: "application/xml", href: "/sitemap.xml" } },
      { tag: "meta", attrs: { property: "og:title", content: practices.title } },
      { tag: "meta", attrs: { property: "og:description", content: description } },
      { tag: "meta", attrs: { property: "og:type", content: "article" } },
      { tag: "meta", attrs: { property: "og:url", content: `${origin}/` } },
      { tag: "meta", attrs: { property: "og:image", content: `${origin}/og.png` } },
      { tag: "meta", attrs: { property: "og:image:width", content: "1200" } },
      { tag: "meta", attrs: { property: "og:image:height", content: "630" } },
      { tag: "meta", attrs: { property: "og:image:alt", content: `${practices.title}. ${description}` } },
      { tag: "meta", attrs: { name: "twitter:card", content: "summary_large_image" } },
      { tag: "meta", attrs: { name: "is-agentic-site-type", content: "content" } },
      { tag: "script", attrs: { type: "application/ld+json" }, children: JSON.stringify(jsonLd) },
    ].map((tag) => ({ ...tag, injectTo: "head" })),
});

await build({
  plugins: [publicPractices(), head()],
  build: { outDir: dist, emptyOutDir: true },
  logLevel: "warn",
});

async function write(path, content) {
  await mkdir(dirname(join(dist, path)), { recursive: true });
  await writeFile(join(dist, path), content);
}

/* The index is drawn by main.js. Running it here against the built page puts
   the entries in the HTML, where a reader with no JavaScript finds them. In
   a browser main.js then draws the same page again over this one. */
const { document } = window;

document.write(await readFile(join(dist, "index.html"), "utf8"));
Object.assign(globalThis, { document, ResizeObserver: window.ResizeObserver });
await server.ssrLoadModule("/main.js");

/* A frame the browser drops a moment later should not load its specimen. */
for (const frame of document.querySelectorAll("iframe")) frame.setAttribute("loading", "lazy");

await write("index.html", `<!doctype html>\n${document.documentElement.outerHTML}\n`);

/* An entry is published twice: the specimen that runs it, and beside it the
   entry itself as Markdown. Alone in a file its heading is the title, and a
   link to another entry's heading goes to that entry's file. */
const alone = (markdown) =>
  markdown
    .replace(/^### /, "# ")
    .replace(/\]\(#([a-z0-9-]+)\)/g, (link, slug) => (bySlug[slug] ? `](${bySlug[slug].markdown})` : link));

for (const [index, entry] of entries.entries()) {
  if (entry.specimen) await write(`specimen/${entry.slug}/index.html`, specimenPage(entry.slug));

  await write(
    `specimen/${entry.slug}.md`,
    frontmatter({ title: entry.title, description: entry.lede, canonical: entry.markdown, updated: today }) +
      alone(entryMarkdown[index]),
  );
}

const stylesheets = [document.querySelector('link[rel="stylesheet"]').getAttribute("href")];
const pageMarkdown = (name) => readFile(join(import.meta.dirname, "pages", `${name}.md`), "utf8");

for (const name of pages) {
  const markdown = await pageMarkdown(name);
  const page = readPage(markdown);
  const meta = { title: page.title, description: text(marked.parseInline(page.statement)), canonical: `${origin}/${name}`, updated: today };

  await write(`${name}/index.html`, sitePage({ page, stylesheets, path: `/${name}` }));
  await write(`${name}.md`, frontmatter(meta) + markdown);
}

/* What vercel.json answers a missing page with, as HTML or as Markdown. */
const notFound = await pageMarkdown("not-found");

await write("not-found.html", sitePage({ page: readPage(notFound), stylesheets }));
await write("not-found.md", notFound);

await server.close();
await window.happyDOM.close();
await rm(cacheDir, { recursive: true, force: true });

/* The picture a link to the site unfurls with: the top of the index at 1200 by 630. */
await copyFile(join(import.meta.dirname, "og.png"), join(dist, "og.png"));

/* The skill, at the path it has in the repo, so the README's "read
   skills/good-css/SKILL.md" holds on the site too. */
const skillPath = "skills/good-css";

await cp(join(root, skillPath), join(dist, skillPath), { recursive: true, filter: (path) => !path.endsWith(".DS_Store") });

const kilobytes = (text) => Math.round(Buffer.byteLength(text) / 1024);

/* An agent told only "read good-css.com" lands on this file, the whole
   list. It opens by sending the agent to the skill, which is what it needs
   to write CSS, as the prompt in the hero does. */
const agentNote = `> If you are an agent about to write CSS, read [the skill](${origin}/${skillPath}/SKILL.md) and follow it, with only the reference files its table names for your task. The rest of this file is the whole list, for study.\n\n`;
const listMarkdown = frontmatter({ title: practices.title, description, canonical: `${origin}/`, updated: today }) + agentNote + practicesMarkdown;

await write("index.md", listMarkdown);
await write("llms-full.txt", practicesMarkdown);
await write(
  "llms.txt",
  llmsTxt({
    title: practices.title,
    description,
    categories,
    skill: { url: `${origin}/${skillPath}`, kilobytes: kilobytes(await readFile(join(root, skillPath, "SKILL.md"), "utf8")) },
    list: { kilobytes: kilobytes(listMarkdown) },
  }),
);
await write("sitemap.xml", sitemap(sitemapUrls(entries), today));
await write("robots.txt", robots);

/* vercel.json names the pages in its rules. The build fails if a page in
   site.js is missing from them. */
const routes = await readFile(join(root, "vercel.json"), "utf8");

if (!routes.includes(`^/(${pages.join("|")})/?$`)) throw new Error("vercel.json does not route every page in deploy/site.js");

/* The build fails if a Source line ever gets past the filter at the top. */
for (const file of await readdir(dist, { recursive: true })) {
  if (!/\.(html|js|md|txt)$/.test(file)) continue;
  if (/Source: ?(\\?`|<code>)/.test(await readFile(join(dist, file), "utf8"))) throw new Error(`${file} holds a Source line`);
}

console.log(`Built ${entries.length} entries and ${entries.filter((entry) => entry.specimen).length} specimens for ${origin}`);
