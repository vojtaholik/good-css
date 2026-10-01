import { origin, pages } from "./site.js";

/* The files an agent looks for at the root of a site. */

/* Opens a Markdown file with what an agent would otherwise scrape for. */
export const frontmatter = ({ title, description, canonical, updated }) => `---
title: ${JSON.stringify(title)}
description: ${JSON.stringify(description)}
canonical: ${canonical}
last-updated: ${updated}
---

`;

export const llmsTxt = ({ title, description, entries }) => `# ${title}

> ${description}

${entries.length} techniques for modern CSS. Every entry has the same shape: when to use it, the CSS, why it works, the rules, and who it is borrowed from. Every entry also runs as a live specimen in the browser.

## When to use this

- You are about to write or review CSS for a page or a component. Read the list first and reach for an entry instead of a set of breakpoints, a wrapper element or a script.
- You need the current technique for one problem, such as a centered content column, a color palette, a carousel, an accordion, a focus ring or a view transition. Find the entry by its title below.
- You want to see a technique running before you use it, or test it in another browser. Open the entry's specimen.

Do not use it as a framework or a component library. It ships no package and no class names. The properties and values are the technique, and the names in the examples are illustrative. Write them in whatever the project already uses.

## How to use it

- Fetch [the whole list as Markdown](${origin}/index.md). It is one file with every entry and its code.
- Or fetch one entry. Each link below is that entry as Markdown, and its specimen is at the same URL without \`.md\`.
- Any page answers a request with \`Accept: text/markdown\` in Markdown.
- Follow the "Rules" of an entry when you apply it. They are the conditions under which it works.
- A specimen page runs the entry's own code blocks, verbatim, with a fixture around them. View its source to see the technique in a working document.

## Entries

${entries
  .map(
    (entry) =>
      `- [${entry.number}. ${entry.title}](${entry.markdown}): ${entry.lede}` +
      (entry.specimen ? ` [Specimen](${entry.specimen})` : ""),
  )
  .join("\n")}

## Files

- [The whole list as Markdown](${origin}/index.md)
- [The same file as llms-full.txt](${origin}/llms-full.txt)
- [The page for people, with every specimen](${origin}/)
- [Sitemap](${origin}/sitemap.xml)

## About this site

- [About](${origin}/about.md): what the list is and who maintains it
- [Contact](${origin}/contact.md): where to report a wrong technique or credit
- [Privacy](${origin}/privacy.md): what the site does with a visit
`;

export const sitemapUrls = (entries) => [
  `${origin}/`,
  ...pages.map((page) => `${origin}/${page}`),
  ...entries.map((entry) => entry.specimen).filter(Boolean),
];

export const sitemap = (urls, modified) => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${url}</loc><lastmod>${modified}</lastmod></url>`).join("\n")}
</urlset>
`;

export const robots = `User-agent: *
Allow: /

Sitemap: ${origin}/sitemap.xml
`;
