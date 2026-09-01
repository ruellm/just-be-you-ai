import { permanentRedirect } from "next/navigation";

// Pricing v2 merged both audiences into /pricing; this route stays as a
// redirect for any external/bookmarked links.
export default function BusinessPricingPage() {
  permanentRedirect("/pricing");
}
