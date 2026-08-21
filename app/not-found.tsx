import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 section-x text-center">
      <Link href="/" className="text-lg font-semibold tracking-tight">
        Just Be You
      </Link>
      <div className="space-y-2">
        <h1 className="text-page-title font-bold tracking-tight">Page not found</h1>
        <p className="text-body text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Go home</Link>
      </Button>
    </main>
  );
}
