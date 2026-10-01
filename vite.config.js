import { defineConfig } from "vite";

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

/* The harness reads PRACTICES.md, which sits one level above its root. */
export default defineConfig({
  root: "harness",
  plugins: [specimens()],
  server: {
    port: 4310,
    fs: { allow: [import.meta.dirname] },
  },
});
