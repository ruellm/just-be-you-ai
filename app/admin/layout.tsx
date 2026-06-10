import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import {
  getCurrentUser,
  getCurrentUserRole,
  getDashboardPath,
} from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const role = await getCurrentUserRole();
  if (role !== "admin") {
    redirect(role ? getDashboardPath(role) : "/login");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppNav
        email={user.email ?? ""}
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
