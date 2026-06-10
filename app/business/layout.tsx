import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import {
  getCurrentUser,
  getCurrentUserRole,
  getDashboardPath,
} from "@/lib/auth";

export default async function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const role = await getCurrentUserRole();
  if (role !== "business") {
    redirect(role ? getDashboardPath(role) : "/login");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppNav
        email={user.email ?? ""}
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
