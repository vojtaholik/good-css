/* A category's or an entry's own page holds that part of the index alone,
   which is all a search engine reads there. The first time a reader scrolls,
   touches, clicks or presses a key, the rest of the index grows around it
   and it stays where it was on the screen. The page's header stays in place
   above the part, and everything the index has before the part grows above
   that header, with the index's own header at the very top. A crawler does
   none of those things, so it never sees more than the part.

   The index is fetched while the page is idle, so it is usually there by
   the time the reader moves. */
import { carousel } from "./carousel.js";
import { categoryMenu } from "./menu.js";
import { specimen } from "./viewport.js";

/* A reload starts on the entry. The browser would restore the scroll of the
   grown page, far below the end of the page that has not grown yet. */
history.scrollRestoration = "manual";

const live = { section: document.querySelector("[data-grows]") };
live.article = live.section.dataset.grows === "entry" ? live.section.querySelector("article.entry") : null;
live.anchor = live.article ?? live.section;

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

/* What the index has before an entry in its category: the category's
   ghost, its opener and the entries before it, as a band of its own. The
   entries after it join the entry's page, and the page's own copy of the
   opener, which it showed after the entry, goes. */
function splitCategory(section) {
  const article = section.querySelector(`article[id="${live.article.id}"]`);
  const { after } = siblings(article);

  article.remove();
  live.article.after(...after);
  live.section.querySelector(":scope > .opener").remove();
  live.section.removeAttribute("id");

  return section;
}

async function grow() {
  const doc = await load();
  const section = doc.getElementById(live.section.id);
  const categories = section.parentElement;
  const top = live.anchor.getBoundingClientRect().top;
  const wired = new Set(document.querySelectorAll(".specimen .viewport"));
  const header = document.querySelector(".site-header");
  const liveCategories = live.section.parentElement;
  const sections = siblings(section);
  const parts = siblings(categories);

  const above = [...sections.before, ...(live.article ? [splitCategory(section)] : [])];
  /* Where the header is a sticky bar, the index's own bar does its job. */
  const sticky = getComputedStyle(header).position === "sticky";
  live.section.before(...above, ...(sticky ? [] : [header]));
  live.section.after(...sections.after);
  copyAttributes(categories, liveCategories);
  liveCategories.before(...parts.before);
  liveCategories.after(...parts.after);

  /* The index's header goes at the top. The page's install popover, whose
     copy button the page already wired, is the only one: it stays in the
     page's header, or moves into the index's where that header went. */
  const indexHeader = doc.querySelector(".site-header");
  const install = indexHeader.querySelector("#install");
  if (sticky) install.replaceWith(header.querySelector("#install"));
  else install.remove();
  if (sticky) header.remove();
  document.querySelector("main").before(indexHeader);
  document.body.setAttribute("style", doc.body.getAttribute("style") ?? "");

  /* The part goes back to where it was before anything grew above it. */
  const shift = live.anchor.getBoundingClientRect().top - top;
  if (shift) window.scrollBy({ top: shift, behavior: "instant" });

  for (const viewport of document.querySelectorAll(".specimen .viewport")) {
    if (!wired.has(viewport)) specimen(viewport);
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
