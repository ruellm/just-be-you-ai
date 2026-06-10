import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { getCurrentDbUser, getDashboardPath } from "@/lib/auth";

export default async function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) redirect("/login");
  if (dbUser.requiresPasswordChange) redirect("/change-password");
  if (dbUser.role !== "business") {
    redirect(getDashboardPath(dbUser.role));
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppNav
        email={dbUser.email}
        links={[
          { label: "Dashboard", href: "/business/dashboard" },
          { label: "Jobs", href: "/business/jobs" },
          { label: "Company", href: "/business/company" },
        ]}
      />
      <div className="flex-1">{children}</div>
    </div>
  );
}
