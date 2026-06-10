import Link from "next/link";

// Shared layout for the public auth pages (/login, /signup, /signup/business).
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Just Be You
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center p-6">
        {children}
      </main>
    </div>
  );
}
