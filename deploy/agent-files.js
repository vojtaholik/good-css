import { origin, pages, repository } from "./site.js";

/* The files an agent looks for at the root of a site. */

/* Opens a Markdown file with what an agent would otherwise scrape for. */
export const frontmatter = ({ title, description, canonical, updated }) => `---
title: ${JSON.stringify(title)}
description: ${JSON.stringify(description)}
canonical: ${canonical}
last-updated: ${updated}
---

`;

const entryLine = (entry) =>
  `- [${entry.number}. ${entry.title}](${entry.markdown}): ${entry.lede}` + (entry.specimen ? ` [Specimen](${entry.specimen})` : "");

/* The skill comes first under "How to use it". An agent that is about to
   write CSS needs a short file and two or three references, not the list.

   The entries are listed by category, one section each, as the index of the
   site lists them. An entry keeps its number from the list, so the numbers in
   a section do not run in order. */
export const llmsTxt = ({ title, description, categories, skill, list }) => `# ${title}

> ${description}

${categories.flatMap((category) => category.entries).length} techniques for modern CSS in ${categories.length} categories. Every entry has the same shape: when to use it, the CSS, why it works, the rules, and who it is borrowed from. Every entry also runs as a live specimen in the browser.

## When to use this

- You are about to write, edit or review CSS for a page or a component. Read the skill first and reach for an entry instead of a set of breakpoints, a wrapper element or a script.
- You need the current technique for one problem, such as a centered content column, a color palette, a carousel, an accordion, a focus ring or a view transition. Find the entry by its title under its category below.
- You want to see a technique running before you use it, or test it in another browser. Open the entry's specimen.

Do not use it as a framework or a component library. It ships no package and no class names. The properties and values are the technique, and the names in the examples are illustrative. Write them in whatever the project already uses.

## How to use it

To write CSS, read the skill. It is the same list, cut down to what an agent needs while writing.

- Fetch [SKILL.md](${skill.url}/SKILL.md). It is ${skill.kilobytes} KB and holds the rules for all CSS and a table that says which reference file to read before which task.
- Fetch only the reference files the table names for your task. They sit beside it, under \`${skill.url}/references/\`. One component needs two or three.
- Install the skill only when your user asked you to. [The README](${repository}#if-you-are-an-agent) has the command.

To study the list, or to learn why a technique works and who it is borrowed from, read the entries.

- Fetch [the whole list as Markdown](${origin}/index.md). It is one file of ${list.kilobytes} KB with every entry and its code.
- Or fetch one entry. Each link under a category below is that entry as Markdown, and its specimen is at the same URL without \`.md\`. The number is the entry's number in the list, which other entries refer to it by.
- Any page answers a request with \`Accept: text/markdown\` in Markdown.
- Follow the "Rules" of an entry when you apply it. They are the conditions under which it works.
- A specimen page runs the entry's own code blocks, verbatim, with a fixture around them. View its source to see the technique in a working document.

${categories.map((category) => `## ${category.title}\n\n${category.entries.map(entryLine).join("\n")}`).join("\n\n")}

## Files

- [The skill for agents](${skill.url}/SKILL.md)
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
