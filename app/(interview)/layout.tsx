import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getCurrentDbUser, getDashboardPath } from "@/lib/auth";

// Interview-only chrome. The live interview route lives in this route group
// (same URL, /candidate/applications/[id]/interview) so it escapes the
// candidate layout's sidebar; the auth/role guard below is IDENTICAL to
// app/candidate/layout.tsx so protection is unchanged.
export default async function InterviewLayout({
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
    <div className="flex min-h-screen flex-col bg-brand-canvas font-body">
      <header className="border-b border-brand-border bg-brand-surface">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-6">
          <Link
            href="/candidate/dashboard"
            className="text-heading font-semibold text-brand-primary"
          >
            Just Be You.
          </Link>
          <Button
            asChild
            className="h-[41px] rounded-[12px] bg-brand-secondary px-5 text-small font-medium text-white hover:bg-brand-secondary/90"
          >
            <Link href="/candidate/dashboard">Return to Home</Link>
          </Button>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
