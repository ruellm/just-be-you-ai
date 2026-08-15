import { redirect } from "next/navigation";

// The profile is now a single page; old section routes redirect there.
export default function LegacyProfileSectionPage() {
  redirect("/candidate/profile");
}
