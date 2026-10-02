/* The one grouping of the list. Each category is a reference file of the
   skill, named by the slug of its title, and a section of the site's index.
   Entries are named by the slug of their title, as the harness fixtures are,
   so renumbering PRACTICES.md changes nothing here. */
export const categories = [
  {
    title: "Foundations",
    entries: [
      "the-reset",
      "logical-properties",
      "oklch-color",
      "one-set-of-color-tokens-for-light-and-dark",
      "fluid-sizes-with-clamp",
      "one-fluid-scale-for-type-and-space",
    ],
  },
  {
    title: "Layout",
    entries: [
      "content-grid-with-breakouts",
      "intrinsic-grid",
      "subgrid-rows-shared-across-cards",
      "sidebar-that-wraps-on-its-own",
      "container-queries-with-container-units",
      "stack-layers-with-grid",
      "safe-alignment",
      "overflow-clip-over-hidden",
    ],
  },
  {
    title: "Spacing and shape",
    entries: [
      "section-spacing-that-depends-on-its-neighbors",
      "space-between-siblings-set-by-the-parent",
      "push-one-item-away-with-an-auto-margin",
      "concentric-nested-radius",
    ],
  },
  {
    title: "Text and media",
    entries: [
      "long-text-that-wraps-truncates-or-clamps",
      "image-box-that-holds-any-upload",
      "tabular-numbers",
      "label-centered-on-its-letters-with-text-box",
      "icon-sized-by-the-text-beside-it",
    ],
  },
  {
    title: "Interaction",
    entries: [
      "one-focus-ring-with-focus-visible",
      "hover-styles-only-where-hover-exists",
      "press-feedback",
      "hit-area-larger-than-the-visual",
      "whole-card-clickable-from-one-link",
      "has-for-parent-and-page-state",
      "form-feedback-with-user-invalid",
      "textarea-that-grows-with-its-content",
    ],
  },
  {
    title: "Motion",
    entries: [
      "opt-in-motion",
      "motion-tokens",
      "transition-a-custom-property-with-property",
      "shadow-change-that-fades-and-does-not-repaint",
      "cross-document-view-transitions",
      "indicator-that-slides-to-the-active-item",
    ],
  },
  {
    title: "Show and hide",
    entries: [
      "enter-and-exit-transitions-from-display-none",
      "popover-anchored-to-its-trigger",
      "accordion-that-animates-its-height",
      "reveal-with-clip-path",
    ],
  },
  {
    title: "Scroll and viewport",
    entries: [
      "carousel-on-native-scroll",
      "scroll-area-between-a-fixed-header-and-footer",
      "styles-that-apply-only-when-a-scroller-overflows",
      "anchor-targets-that-clear-a-sticky-header",
      "no-rubber-band-bounce-on-desktop",
      "content-clear-of-the-notch",
    ],
  },
];
