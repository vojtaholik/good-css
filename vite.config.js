import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { defineConfig } from "vite";
import { categoryNav, footer, header, installCommand, readPage, sitePage } from "./deploy/page.js";
import { pages } from "./deploy/site.js";

/* Serves each specimen as a page of its own at /specimen/<slug>, built on
   request from PRACTICES.md and the fixture. A real URL means a specimen can
   be opened in another browser or on a phone, with `vite --host`. */
const specimens = () => ({
  name: "specimens",
  configureServer(server) {
    server.middlewares.use("/specimen", async (request, response) => {
      const slug = new URL(request.url, "http://localhost").pathname.slice(1);
      const { specimenPage } = await server.ssrLoadModule("/frame.js");
      const page = specimenPage(slug);

      response.statusCode = page ? 200 : 404;
      response.setHeader("Content-Type", "text/html");
      response.end(page ?? `No specimen for "${slug}".`);
    });
  },
});

/* The header, the footer and the install command are written once, in
   deploy/page.js. The index names where each one goes with a comment. */
const chrome = () => ({
  name: "chrome",
  transformIndexHtml: (html) =>
    html
      .replace("<!-- header -->", header(categoryNav))
      .replace("<!-- install-command -->", installCommand)
      .replace("<!-- footer -->", footer),
});

/* Serves the pages of deploy/pages while developing, as the build draws them. */
const sitePages = () => ({
  name: "site-pages",
  configureServer(server) {
    server.middlewares.use(async (request, response, next) => {
      const name = new URL(request.url, "http://localhost").pathname.slice(1);

      if (![...pages, "not-found"].includes(name)) return next();

      const markdown = await readFile(join(import.meta.dirname, "deploy/pages", `${name}.md`), "utf8");

      response.setHeader("Content-Type", "text/html");
      response.end(sitePage({ page: readPage(markdown), stylesheets: ["/tokens.css", "/harness.css"], path: `/${name}` }));
    });
  },
});

/* The harness reads PRACTICES.md, which sits one level above its root. */
export default defineConfig({
  root: "harness",
  plugins: [specimens(), chrome(), sitePages()],
  server: {
    port: 4310,
    fs: { allow: [import.meta.dirname] },
  },
});
