import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { getCurrentDbUser, getDashboardPath } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) redirect("/login");
  if (dbUser.requiresPasswordChange) redirect("/change-password");
  if (dbUser.role !== "admin") {
    redirect(getDashboardPath(dbUser.role));
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppNav
        email={dbUser.email}
        links={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Users", href: "/admin/users" },
          { label: "Companies", href: "/admin/companies" },
          { label: "AI Config", href: "/admin/ai-config" },
        ]}
      />
      <div className="flex-1">{children}</div>
    </div>
  );
}
