import { pages } from "./site.js";

/* Routing for Vercel, written to .vercel/output/config.json. Every response
   is a static file. These rules add the two things a file server cannot do:
   answer a request for Markdown with Markdown, and answer a missing page
   with a 404 in the form that was asked for. */
const wantsMarkdown = [{ type: "header", key: "accept", value: ".*text/markdown.*" }];
const page = `^/(${pages.join("|")})/?$`;
const specimen = "^/specimen/([^/.]+)/?$";

const links = [
  '</index.md>; rel="alternate"; type="text/markdown"',
  '</llms.txt>; rel="describedby"; type="text/plain"',
  '</sitemap.xml>; rel="sitemap"; type="application/xml"',
].join(", ");

export const vercelConfig = {
  version: 3,
  routes: [
    { src: "^/$", headers: { Vary: "Accept", Link: links }, continue: true },
    { src: "^/$", has: wantsMarkdown, dest: "/index.md" },
    { src: page, headers: { Vary: "Accept" }, continue: true },
    { src: page, has: wantsMarkdown, dest: "/$1.md" },
    { src: specimen, headers: { Vary: "Accept" }, continue: true },
    { src: specimen, has: wantsMarkdown, dest: "/specimen/$1.md" },
    { handle: "filesystem" },
    { handle: "error" },
    { src: "^/.*$", status: 404, has: wantsMarkdown, dest: "/404.md", headers: { Vary: "Accept" } },
    { src: "^/.*$", status: 404, dest: "/404.html", headers: { Vary: "Accept" } },
  ],
};
