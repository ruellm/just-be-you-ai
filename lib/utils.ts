import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// The fluid type scale in app/globals.css is defined with `@utility text-*`
// rules, which tailwind-merge knows nothing about: its default config matches
// `text-<t-shirt size>` as a font size and falls back to treating every other
// `text-*` as a COLOUR. That made `text-small` and `text-brand-ink` look like
// the same conflict group, so whichever came last silently deleted the other —
// e.g. "text-small … text-brand-ink" dropped the size, and
// "text-destructive text-meta" dropped the colour.
//
// Registering the custom sizes in the `font-size` group fixes both directions:
// a size followed by a colour now survives, two sizes still collapse to the
// last, and a custom size correctly overrides a core one (text-base/text-sm).
// Keep this list in sync with the `@utility text-*` rules in globals.css.
const CUSTOM_FONT_SIZES = [
  "display",
  "page-title",
  "section",
  "heading",
  "subheading",
  "body",
  "small",
  "meta",
  "price",
]

const twMerge = extendTailwindMerge({
  extend: { classGroups: { "font-size": [{ text: CUSTOM_FONT_SIZES }] } },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
