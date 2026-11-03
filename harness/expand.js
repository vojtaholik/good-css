/* An entry's own page holds that entry alone, which is all a search engine
   reads there. The first time a reader scrolls, touches, clicks or presses a
   key, the rest of the index grows around the entry, and the entry stays
   where it was on the screen. From then on the page is the index, scrolled
   to that entry. A crawler does none of those things, so it never sees more
   than the entry.

   The index is fetched while the page is idle, so it is usually there by
   the time the reader moves. */
import { carousel } from "./carousel.js";
import { categoryMenu } from "./menu.js";
import { specimen } from "./viewport.js";

/* A reload starts on the entry. The browser would restore the scroll of the
   grown page, far below the end of the page that has not grown yet. */
history.scrollRestoration = "manual";

const live = {
  section: document.querySelector(".entry-page"),
  article: document.querySelector(".entry-page article.entry"),
};

let index;
const load = () =>
  (index ??= fetch("/")
    .then((response) => response.text())
    .then((html) => new DOMParser().parseFromString(html, "text/html")));

if ("requestIdleCallback" in window) requestIdleCallback(load, { timeout: 3000 });
else setTimeout(load, 1500);

const siblings = (node) => {
  const before = [];
  const after = [];
  let side = before;

  for (const child of node.parentElement.children) {
    if (child === node) side = after;
    else side.push(child);
  }

  return { before, after };
};

function copyAttributes(from, to) {
  for (const { name } of [...to.attributes]) to.removeAttribute(name);
  for (const { name, value } of from.attributes) to.setAttribute(name, value);
}

async function grow() {
  const doc = await load();
  const article = doc.getElementById(live.article.id);
  const section = article.closest("section.category");
  const categories = section.parentElement;
  const main = categories.parentElement;
  const top = live.article.getBoundingClientRect().top;

  /* The entry's own node stays put, so its specimen does not load again. The
     index is built around it: its neighbours in the category, the category's
     opener, the other categories, and what comes before and after them. */
  const entries = live.article.parentElement;
  const around = siblings(article);
  /* The page's own ghost and opener give way to the index's, which sit
     above the entries as they do on the index. */
  live.section.querySelector(":scope > .ghost")?.remove();
  live.section.querySelector(":scope > .opener").remove();
  entries.before(...[...section.children].filter((child) => !child.contains(article)));
  live.article.before(...around.before);
  live.article.after(...around.after);
  copyAttributes(section, live.section);

  const liveCategories = live.section.parentElement;
  const sections = siblings(section);
  live.section.before(...sections.before);
  live.section.after(...sections.after);
  copyAttributes(categories, liveCategories);

  const parts = siblings(categories);
  liveCategories.before(...parts.before);
  liveCategories.after(...parts.after);

  /* The header gains the index's list of categories. Its other parts stay,
     with what the page already wired to them. */
  const mark = document.querySelector(".site-header .mark");
  mark.after(doc.querySelector(".site-header .current"), doc.getElementById("category-menu"));
  document.body.setAttribute("style", doc.body.getAttribute("style") ?? "");

  /* The entry goes back to where it was before anything grew above it. */
  window.scrollBy({ top: live.article.getBoundingClientRect().top - top, behavior: "instant" });

  for (const viewport of document.querySelectorAll(".specimen .viewport")) {
    if (!live.article.contains(viewport)) specimen(viewport);
  }

  categoryMenu(document.getElementById("category-menu"));
  carousel(document.querySelector('[data-slot="cards"]'));
}

const events = ["wheel", "touchstart", "pointerdown", "keydown"];

const start = () => {
  for (const name of events) removeEventListener(name, start, { capture: true });
  grow();
};

for (const name of events) addEventListener(name, start, { capture: true, passive: true });
