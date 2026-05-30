import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
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

      <div className="flex items-center gap-3">
        <Button asChild size="lg">
          <Link href="/login">Login</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/signup">Sign up</Link>
        </Button>
      </div>
    </main>
  );
}
