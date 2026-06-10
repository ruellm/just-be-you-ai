import { redirect } from "next/navigation";

// /candidate/profile has no content of its own — send to the first section.
export default function ProfileIndexPage() {
  redirect("/candidate/profile/basic-info");
}
