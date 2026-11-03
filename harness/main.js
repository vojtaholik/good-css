/* What the index does in a browser. The page is drawn by draw.js. The built
   page arrives drawn, so draw.js is loaded only where the page is still
   empty: on the dev server, and in the build that draws it. */
import { carousel } from "./carousel.js";
import { categoryMenu } from "./menu.js";
import { specimen } from "./viewport.js";

const slot = (root, name) => root.querySelector(`[data-slot="${name}"]`);

const empty = !slot(document, "categories").childElementCount;

if (empty) await import("./draw.js");

for (const viewport of document.querySelectorAll(".specimen .viewport")) specimen(viewport);

/* An entry's own page has no list of categories until it grows. */
const menu = document.getElementById("category-menu");

if (menu) categoryMenu(menu);

/* The row of cards is on the index only. */
const cards = slot(document, "cards");
const draw = cards && carousel(cards);

/* The built page already holds what draw draws for the first card, so only
   a page drawn just now needs it. */
if (cards && empty) draw();

/* A category's or an entry's own page grows into the index the first time it is used. */
if (document.querySelector("[data-grows]")) import("./expand.js");
