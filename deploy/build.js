import { copyFile, cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Window } from "happy-dom";
import { build, createServer } from "vite";
import { marked } from "marked";
import { frontmatter, llmsTxt, robots, sitemap, sitemapUrls } from "./agent-files.js";
import { readPage, sitePage } from "./page.js";
import { author, origin, pages, published } from "./site.js";

/* Builds the harness into dist/ as a static site: the index with its content
   already in the HTML, one page per entry at /<slug>, the pages
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
   the same practices.js, frame.js, draw.js and main.js. */
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
  markdown: `${origin}/${entry.slug}.md`,
  page: `${origin}/${entry.slug}`,
}));

/* The same entries by category, in the order the page shows them. */
const bySlug = Object.fromEntries(entries.map((entry) => [entry.slug, entry]));
const categories = practices.categories.map((category) => ({
  slug: category.slug,
  title: category.title,
  entries: category.entries.map((entry) => bySlug[entry.slug]),
}));

/* Entries, categories and pages share the root, beside what the build
   writes there. The build stops on a slug two of them would claim. */
const reserved = ["frame", "assets", "fonts", "art", "icons", "patterns", "skills", "index", "llms", "llms-full", "not-found", "sitemap", "robots", "og", "mark", "wordmark"];
const claimed = [...entries.map((entry) => entry.slug), ...categories.map((category) => category.slug), ...pages, ...reserved];
const clash = claimed.find((slug, index) => claimed.indexOf(slug) !== index);

if (clash) throw new Error(`Two things claim /${clash}`);

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
      { tag: "script", attrs: { defer: true, src: "/_vercel/insights/script.js" } },
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

/* The index is drawn by draw.js, which main.js loads when the page is empty.
   Running main.js here against the built page puts the entries in the HTML,
   where a reader with no JavaScript finds them. In a browser main.js finds
   the page drawn, leaves it as it is and loads nothing more. */
const { document } = window;

document.write(await readFile(join(dist, "index.html"), "utf8"));
Object.assign(globalThis, { document, ResizeObserver: window.ResizeObserver });
await server.ssrLoadModule("/main.js");

/* The templates are for drawing, and the built page arrives drawn. */
for (const template of document.querySelectorAll("template")) template.remove();

await write("index.html", `<!doctype html>\n${document.documentElement.outerHTML}\n`);

/* An entry is published twice: the specimen that runs it, and beside it the
   entry itself as Markdown. Alone in a file its heading is the title, and a
   link to another entry's heading goes to that entry's file. */
const alone = (markdown) =>
  markdown
    .replace(/^### /, "# ")
    .replace(/\]\(#([a-z0-9-]+)\)/g, (link, slug) => (bySlug[slug] ? `](${bySlug[slug].markdown})` : link));

/* Each category and each entry gets a page of its own, the one a search
   finds: the drawn index cut down to that category, or to that entry with its
   category after it. expand.js grows it into the index the first time it is
   used. A specimen runs in a frame from /frame/<slug>, which search engines
   skip. */
const homeHead = [
  'meta[name="description"]',
  'link[rel="canonical"]',
  'link[rel="alternate"]',
  'link[rel="preload"][as="image"]',
  'meta[property^="og:"]',
  'meta[name^="twitter:"]',
  'script[type="application/ld+json"]',
].join(", ");

/* The drawn index with only `section` left in its main, marked for expand.js. */
function cutDown(sectionId, grows) {
  const page = document.documentElement.cloneNode(true);
  const section = page.querySelector(`section[id="${sectionId}"]`);
  const categories = page.querySelector('[data-slot="categories"]');

  section.setAttribute("data-grows", grows);
  categories.replaceChildren(section);
  page.querySelector("main").replaceChildren(categories);

  /* The header takes the tone of the band under it, so a dark band reaches
     the top of the window. */
  const header = page.querySelector(".site-header");
  header.classList.add("site-header-over");
  if (section.classList.contains("band-dark")) header.classList.add("band-dark");

  /* The header's list of categories belongs to the index. */
  page.querySelector(".site-header .current")?.remove();
  page.querySelector("#category-menu")?.remove();

  return { page, section };
}

const heading = (node, tag) => {
  const replacement = document.createElement(tag);
  replacement.setAttribute("data-slot", "title");
  /* The page's own title needs no link to itself. */
  replacement.innerHTML = node.querySelector("a")?.innerHTML ?? node.innerHTML;
  node.replaceWith(replacement);
};

function finish(page, { title, description, url, markdown, ld }) {
  /* A link to a part of the index goes back to the index. */
  for (const link of page.querySelectorAll('a[href^="#"]')) {
    const id = link.getAttribute("href").slice(1);
    if (id && !page.querySelector(`[id="${id}"]`)) link.setAttribute("href", `/#${id}`);
  }

  const head = page.querySelector("head");

  for (const tag of head.querySelectorAll(homeHead)) tag.remove();
  head.querySelector("title").textContent = title;

  const tags = [
    ["meta", { name: "description", content: description }],
    ["link", { rel: "canonical", href: url }],
    ["link", { rel: "alternate", type: "text/markdown", href: markdown, title: "This page as Markdown" }],
    ["meta", { property: "og:title", content: title }],
    ["meta", { property: "og:description", content: description }],
    ["meta", { property: "og:type", content: "article" }],
    ["meta", { property: "og:url", content: url }],
    ["meta", { property: "og:image", content: `${origin}/og.png` }],
    ["meta", { name: "twitter:card", content: "summary_large_image" }],
  ];

  for (const [name, attrs] of tags) {
    const tag = document.createElement(name);
    for (const [key, value] of Object.entries(attrs)) tag.setAttribute(key, value);
    head.append(tag);
  }

  const script = document.createElement("script");
  script.setAttribute("type", "application/ld+json");
  script.textContent = JSON.stringify({
    "@context": "https://schema.org",
    url,
    description,
    image: `${origin}/og.png`,
    inLanguage: "en",
    datePublished: published,
    dateModified: today,
    author: person,
    publisher: person,
    isPartOf: { "@type": "WebSite", name: practices.title, url: `${origin}/` },
    ...ld,
  });
  head.append(script);

  return `<!doctype html>\n${page.outerHTML}\n`;
}

function entryPage(entry) {
  const category = practices.categories.find((category) => category.entries.some(({ slug }) => slug === entry.slug));
  const { page, section } = cutDown(category.slug, "entry");
  const article = section.querySelector(`article[id="${entry.slug}"]`);

  for (const other of section.querySelectorAll("article.entry")) if (other !== article) other.remove();

  /* The entry comes first, and its category follows as the way to the rest. */
  section.classList.add("entry-page");
  section.insertBefore(section.querySelector(".entries"), section.querySelector(".opener"));
  heading(article.querySelector("h3"), "h1");

  /* The category's list goes to the other entries' pages. */
  for (const link of section.querySelectorAll(".entry-index a")) {
    const slug = link.getAttribute("href").slice(1);
    link.setAttribute("href", `/${slug}`);
    if (slug === entry.slug) link.setAttribute("aria-current", "page");
  }

  return finish(page, {
    title: `${entry.title} · good-css`,
    description: entry.lede,
    url: entry.page,
    markdown: `/${entry.slug}.md`,
    ld: {
      "@type": "TechArticle",
      headline: entry.title,
      encoding: { "@type": "MediaObject", encodingFormat: "text/markdown", contentUrl: entry.markdown },
    },
  });
}

function categoryPage(category) {
  const { page, section } = cutDown(category.slug, "category");
  const url = `${origin}/${category.slug}`;
  const titles = category.entries.map((entry) => entry.title);
  const description = `${category.entries.length} modern CSS techniques for ${category.title.toLowerCase()}, each with a live specimen: ${titles.join(", ")}.`;

  heading(section.querySelector(".opener h2"), "h1");

  /* Under the page's h1 the entries' titles are h2, still links to their pages. */
  for (const title of section.querySelectorAll("article.entry h3")) {
    const h2 = document.createElement("h2");
    h2.setAttribute("data-slot", "title");
    h2.innerHTML = title.innerHTML;
    title.replaceWith(h2);
  }

  return finish(page, {
    title: `${category.title}: ${category.entries.length} modern CSS techniques · good-css`,
    description,
    url,
    markdown: `/${category.slug}.md`,
    ld: {
      "@type": "CollectionPage",
      name: category.title,
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: category.entries.length,
        itemListElement: category.entries.map((entry, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: entry.title,
          url: entry.page,
        })),
      },
    },
  });
}

for (const [index, category] of categories.entries()) {
  await write(`${category.slug}/index.html`, categoryPage(category));
  await write(
    `${category.slug}.md`,
    frontmatter({ title: category.title, description: `Modern CSS techniques for ${category.title.toLowerCase()}.`, canonical: `${origin}/${category.slug}.md`, updated: today }) +
      raw(categorySections[index]).replace(/^## /, "# "),
  );
}

for (const [index, entry] of entries.entries()) {
  if (demos[entry.slug]) await write(`frame/${entry.slug}/index.html`, specimenPage(entry.slug));
  await write(`${entry.slug}/index.html`, entryPage(entry));

  await write(
    `${entry.slug}.md`,
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
await write("sitemap.xml", sitemap(sitemapUrls(entries, categories), today));
await write("robots.txt", robots);

/* vercel.json answers a request for any page with Markdown by one rule. */
const routes = await readFile(join(root, "vercel.json"), "utf8");

if (!routes.includes("^/([^/.]+)/?$")) throw new Error("vercel.json does not answer every page with Markdown on request");

/* The build fails if a Source line ever gets past the filter at the top. */
for (const file of await readdir(dist, { recursive: true })) {
  if (!/\.(html|js|md|txt)$/.test(file)) continue;
  if (/Source: ?(\\?`|<code>)/.test(await readFile(join(dist, file), "utf8"))) throw new Error(`${file} holds a Source line`);
}

console.log(`Built ${entries.length} entry pages and ${Object.keys(demos).length} specimens for ${origin}`);
