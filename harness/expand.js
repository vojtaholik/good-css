/* A category's or an entry's own page holds that part of the index alone,
   which is all a search engine reads there. The first time a reader scrolls,
   touches, clicks or presses a key, the rest of the index grows around it,
   and it stays where it was on the screen. From then on the page is the
   index, scrolled to that part. A crawler does none of those things, so it
   never sees more than the part.

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

/* An entry's page holds its category's opener after the entry. It gives way
   to the index's, above the entries as on the index, and the entry gets its
   neighbours in the category back. */
function growEntry(section) {
  const article = section.querySelector(`article[id="${live.article.id}"]`);
  const around = siblings(article);

  live.section.querySelector(":scope > .ghost")?.remove();
  live.section.querySelector(":scope > .opener").remove();
  live.article.parentElement.before(...[...section.children].filter((child) => !child.contains(article)));
  live.article.before(...around.before);
  live.article.after(...around.after);
}

/* What the reader saw above the part, the header and the band's space under
   it, stays on the screen where it was, laid over the grown page, and
   scrolls away with it. It goes once it is out of the window, or fades as
   soon as the reader scrolls up, where the index's own content is. */
function stand(header, top, ground) {
  const cover = document.createElement("div");
  const rect = header.getBoundingClientRect();
  const copy = header.cloneNode(true);

  copy.querySelector("#install")?.remove();
  cover.className = "stand";
  cover.dataset.screenTop = rect.top;
  cover.style.cssText = `position: absolute; inset-inline: 0; z-index: 3; top: ${scrollY + rect.top}px; height: ${top - rect.top}px; background: ${ground}`;
  cover.append(copy);

  return cover;
}

function standAside(cover) {
  let last = scrollY;
  const watch = new IntersectionObserver(([{ isIntersecting }]) => isIntersecting || leave());

  const leave = () => {
    watch.disconnect();
    removeEventListener("scroll", onScroll);
    cover.remove();
  };

  const onScroll = () => {
    if (scrollY >= last) return void (last = scrollY);

    removeEventListener("scroll", onScroll);
    cover.animate({ opacity: [1, 0] }, { duration: 180, easing: "ease-out" }).finished.then(leave);
  };

  watch.observe(cover);
  addEventListener("scroll", onScroll, { passive: true });
}

async function grow() {
  const doc = await load();
  const section = doc.getElementById(live.section.id);
  const categories = section.parentElement;
  const top = live.anchor.getBoundingClientRect().top;
  const wired = new Set(document.querySelectorAll(".specimen .viewport"));

  const header = document.querySelector(".site-header");
  const ground = getComputedStyle(live.section).backgroundColor;
  const cover = stand(header, top, ground);

  if (live.article) growEntry(section);
  copyAttributes(section, live.section);

  /* The page's own nodes stay put, so its specimens do not load again. The
     index is built around them: the other categories, and what comes before
     and after them. */
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
  /* Above the hero the header is light again, as on the index. */
  header.classList.remove("band-dark");
  const mark = header.querySelector(".mark");
  mark.after(doc.querySelector(".site-header .current"), doc.getElementById("category-menu"));
  document.body.setAttribute("style", doc.body.getAttribute("style") ?? "");

  /* The entry goes back to where it was before anything grew above it. */
  window.scrollBy({ top: live.anchor.getBoundingClientRect().top - top, behavior: "instant" });

  /* The cover was measured before anything grew; the screen has not moved since. */
  cover.style.top = `${scrollY + parseFloat(cover.dataset.screenTop)}px`;
  document.body.append(cover);

  for (const viewport of document.querySelectorAll(".specimen .viewport")) {
    if (!wired.has(viewport)) specimen(viewport);
  }

  standAside(cover);
  categoryMenu(document.getElementById("category-menu"));
  carousel(document.querySelector('[data-slot="cards"]'));
}

const events = ["wheel", "touchstart", "pointerdown", "keydown"];

const start = () => {
  for (const name of events) removeEventListener(name, start, { capture: true });
  grow();
};

for (const name of events) addEventListener(name, start, { capture: true, passive: true });
