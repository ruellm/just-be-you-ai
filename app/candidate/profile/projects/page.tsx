import { redirect } from "next/navigation";

// Projects have no standalone page — they're managed inside each Work
// Experience entry. Send the sidebar's "Projects" link there.
export default function ProjectsPage() {
  redirect("/candidate/profile/work-experience");
}
