import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { getCurrentDbUser, getDashboardPath } from "@/lib/auth";

export default async function CandidateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) redirect("/login");
  if (dbUser.requiresPasswordChange) redirect("/change-password");
  if (dbUser.role !== "candidate") {
    redirect(getDashboardPath(dbUser.role));
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppNav
        email={dbUser.email}
        logoHref={getDashboardPath(dbUser.role)}
        links={[
          { label: "Dashboard", href: "/candidate/dashboard" },
          { label: "Browse jobs", href: "/candidate/jobs" },
          { label: "My Applications", href: "/candidate/applications" },
          { label: "Profile", href: "/candidate/profile/basic-info" },
        ]}
      />
      <div className="flex-1">{children}</div>
    </div>
  );
}
