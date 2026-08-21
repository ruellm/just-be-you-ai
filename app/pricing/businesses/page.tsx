import { permanentRedirect } from "next/navigation";

export default function BusinessPricingPage() {
  permanentRedirect("/pricing?audience=businesses");
}
