import { redirect } from "next/navigation";
import { BusinessSidebar } from "@/components/business/BusinessSidebar";
import { getCurrentDbUser, getDashboardPath } from "@/lib/auth";
import { prisma } from "@/lib/db";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((p) => p.charAt(0).toUpperCase());
  return letters.join("") || "?";
}

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

  const company = await prisma.company.findUnique({
    where: { userId: dbUser.id },
    select: { name: true, logoUrl: true },
  });
  const companyName = company?.name.trim() || "Your company";

  return (
    <div className="min-h-screen bg-brand-canvas">
      <BusinessSidebar
        companyName={companyName}
        initials={initialsOf(companyName)}
        logoUrl={company?.logoUrl ?? null}
      />
      {/* Content sits to the right of the fixed 255px sidebar on lg+. */}
      <main className="min-w-0 lg:pl-[255px]">{children}</main>
    </div>
  );
}
