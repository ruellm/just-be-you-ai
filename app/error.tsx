"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 section-x text-center">
      <span className="text-lg font-semibold tracking-tight">Just Be You</span>
      <div className="space-y-2">
        <h1 className="text-page-title font-bold tracking-tight">
          Something went wrong
        </h1>
        <p className="text-body text-muted-foreground">
          Sorry — an unexpected error occurred on our end. Please try again.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/">Go home</Link>
        </Button>
      </div>
      <a
        href="mailto:hello@justbeyou.ai"
        className="text-muted-foreground hover:text-foreground text-small underline"
      >
        Contact support
      </a>
    </main>
  );
}
