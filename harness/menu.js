/* A tap on a category in the header's list goes there and closes the list. */
export function categoryMenu(menu) {
  menu.addEventListener("click", (event) => {
    if (event.target.closest("a")) menu.hidePopover();
  });
}
