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
    <main className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-16 text-center">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Just Be You
        </h1>
        <p className="text-muted-foreground mx-auto max-w-xl text-lg">
          AI-powered interviews that help great talent get noticed — and help
          companies find the right people, faster.
        </p>
      </div>

      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/signup">I&apos;m a candidate, sign up</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/login">Log in</Link>
        </Button>
      </div>

      <p className="text-muted-foreground text-sm">
        Are you a business? Contact us at{" "}
        <a href="mailto:hello@justbeyou.ai" className="underline">
          hello@justbeyou.ai
        </a>{" "}
        to get started.
      </p>

      {/* How it works */}
      <div className="border-t pt-10">
        <p className="text-muted-foreground mb-6 text-xs font-medium tracking-wide uppercase">
          How it works
        </p>
        <ol className="grid gap-6 text-left sm:grid-cols-3">
          {[
            {
              step: "1",
              title: "Apply",
              body: "Build your profile and apply to roles matched to your skills.",
            },
            {
              step: "2",
              title: "AI Interview",
              body: "Take a short, on-demand AI interview — anytime, no scheduling.",
            },
            {
              step: "3",
              title: "Get Matched",
              body: "Your results are shared with companies hiring for the role.",
            },
          ].map((s) => (
            <li key={s.step} className="space-y-2">
              <div className="bg-muted text-foreground flex size-8 items-center justify-center rounded-full text-sm font-semibold">
                {s.step}
              </div>
              <p className="font-medium">{s.title}</p>
              <p className="text-muted-foreground text-sm">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}
