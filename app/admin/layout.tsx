import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { getCurrentDbUser, getDashboardPath } from "@/lib/auth";

function initialsOf(name: string): string {
  const parts = name.trim().split(/[\s._@-]+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((p) => p.charAt(0).toUpperCase());
  return letters.join("") || "?";
}

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

  const displayName = dbUser.email || "Administrator";

  return (
    <div className="min-h-screen bg-brand-canvas">
      <AdminSidebar displayName={displayName} initials={initialsOf(displayName)} />
      <main className="min-w-0 lg:pl-[255px]">{children}</main>
    </div>
  );
}
