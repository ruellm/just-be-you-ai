import Link from "next/link";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

// Top navigation shown inside every role-scoped section. Server component:
// the logout form posts to the signOut server action. `links` are optional
// section links (e.g. the candidate's Dashboard / Browse jobs / Profile).
export function AppNav({
  email,
  links = [],
}: {
  email: string;
  links?: { label: string; href: string }[];
}) {
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Just Be You
          </Link>
          {links.length > 0 ? (
            <nav className="flex items-center gap-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          ) : null}
        </div>
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
