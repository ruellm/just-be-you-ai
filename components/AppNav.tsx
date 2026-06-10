import Link from "next/link";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

// Top navigation shown inside every role-scoped section. Server component:
// the logout form posts to the signOut server action.
export function AppNav({ email }: { email: string }) {
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Just Be You
        </Link>
        <div className="flex items-center gap-4">
          {email ? (
            <span className="text-muted-foreground hidden text-sm sm:inline">
              {email}
            </span>
          ) : null}
          <form action={signOut}>
            <Button type="submit" variant="outline" size="sm">
              Log out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
