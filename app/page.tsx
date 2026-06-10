import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getCurrentDbUser, getDashboardPath } from "@/lib/auth";

export default async function HomePage() {
  // If already signed in, skip the landing page. Force a pending password
  // change first; otherwise go straight to the role-based dashboard.
  const dbUser = await getCurrentDbUser();
  if (dbUser) {
    if (dbUser.requiresPasswordChange) redirect("/change-password");
    redirect(getDashboardPath(dbUser.role));
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Just Be You
        </h1>
        <p className="text-muted-foreground max-w-md text-lg">
          Build your profile, get matched with jobs, and let your skills speak
          for themselves.
        </p>
      </div>

      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <Button asChild size="lg" variant="outline">
          <Link href="/login">Log in</Link>
        </Button>
        <Button asChild size="lg">
          <Link href="/signup">I&apos;m a candidate, sign up</Link>
        </Button>
      </div>

      <p className="text-muted-foreground text-sm">
        Are you a business? Contact us at{" "}
        <a href="mailto:hello@justbeyou.ai" className="underline">
          hello@justbeyou.ai
        </a>{" "}
        to get started.
      </p>
    </main>
  );
}
