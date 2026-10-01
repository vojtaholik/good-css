import { copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Window } from "happy-dom";
import { build, createServer } from "vite";
import { marked } from "marked";
import { frontmatter, llmsTxt, robots, sitemap, sitemapUrls } from "./agent-files.js";
import { footer, readPage, sitePage } from "./page.js";
import { author, origin, pages, published } from "./site.js";
import { vercelConfig } from "./vercel.js";

/* Builds the harness for Vercel, in the Build Output layout: the index with
   its content already in the HTML, one page per specimen at /specimen/<slug>,
   the pages in deploy/pages, and the files an agent looks for.

   A push to main deploys it: vercel.json has Vercel run `bun run build` and
   serve what lands in .vercel/output. The dev server is untouched. */
const root = join(import.meta.dirname, "..");
const output = join(root, ".vercel/output");
const dist = join(output, "static");
const cacheDir = join(root, "node_modules/.vite-build");

/* The "- Source:" lines of PRACTICES.md hold local file paths. This is the
   only copy of the file the build reads, so they reach nothing public. */
const practicesMarkdown = (await readFile(join(root, "PRACTICES.md"), "utf8")).replace(/^- Source:.*\n/gm, "");

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
  number: entry.number,
  slug: entry.slug,
  title: text(entry.title),
  lede: firstSentence(text(entry.lede)),
  markdown: `${origin}/specimen/${entry.slug}.md`,
  specimen: demos[entry.slug] ? `${origin}/specimen/${entry.slug}` : null,
}));

/* Each numbered section of PRACTICES.md as Markdown, in the order of the
   entries. practices.js splits the file at the same headings. */
const entrySections = [];

for (const token of marked.lexer(practicesMarkdown)) {
  if (token.type === "heading" && token.depth === 2) entrySections.push(/^\d+\./.test(token.text) ? [] : null);
  entrySections.at(-1)?.push(token.raw);
}

const entryMarkdown = entrySections.filter(Boolean).map((raw) => raw.join("").trim() + "\n");

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
    itemListElement: entries.map((entry) => ({
      "@type": "ListItem",
      position: entry.number,
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

/* main.js redraws <main>, so the footer sits after it. */
document.querySelector("main").insertAdjacentHTML("afterend", footer);

await write("index.html", `<!doctype html>\n${document.documentElement.outerHTML}\n`);

/* An entry is published twice: the specimen that runs it, and beside it the
   entry itself as Markdown. */
for (const [index, entry] of entries.entries()) {
  if (entry.specimen) await write(`specimen/${entry.slug}/index.html`, specimenPage(entry.slug));

  await write(
    `specimen/${entry.slug}.md`,
    frontmatter({ title: `${entry.number}. ${entry.title}`, description: entry.lede, canonical: entry.markdown, updated: today }) +
      entryMarkdown[index],
  );
}

const stylesheet = document.querySelector('link[rel="stylesheet"]').getAttribute("href");
const pageMarkdown = (name) => readFile(join(import.meta.dirname, "pages", `${name}.md`), "utf8");

for (const name of pages) {
  const markdown = await pageMarkdown(name);
  const page = readPage(markdown);
  const meta = { title: page.title, description: text(marked.parseInline(page.statement)), canonical: `${origin}/${name}`, updated: today };

  await write(`${name}/index.html`, sitePage({ page, stylesheet, path: `/${name}` }));
  await write(`${name}.md`, frontmatter(meta) + markdown);
}

const notFound = await pageMarkdown("404");

await write("404.html", sitePage({ page: readPage(notFound), stylesheet }));
await write("404.md", notFound);

await server.close();
await window.happyDOM.close();
await rm(cacheDir, { recursive: true, force: true });

/* The picture a link to the site unfurls with: the masthead at 1200 by 630. */
await copyFile(join(import.meta.dirname, "og.png"), join(dist, "og.png"));

await write(
  "index.md",
  frontmatter({ title: practices.title, description, canonical: `${origin}/`, updated: today }) + practicesMarkdown,
);
await write("llms-full.txt", practicesMarkdown);
await write("llms.txt", llmsTxt({ title: practices.title, description, entries }));
await write("sitemap.xml", sitemap(sitemapUrls(entries), today));
await write("robots.txt", robots);

await writeFile(join(output, "config.json"), JSON.stringify(vercelConfig, null, 2));

/* The build fails if a Source line ever gets past the filter at the top. */
for (const file of await readdir(dist, { recursive: true })) {
  if (!/\.(html|js|md|txt)$/.test(file)) continue;
  if (/Source: ?(\\?`|<code>)/.test(await readFile(join(dist, file), "utf8"))) throw new Error(`${file} holds a Source line`);
}

console.log(`Built ${entries.length} entries and ${entries.filter((entry) => entry.specimen).length} specimens for ${origin}`);
