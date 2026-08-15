import Link from "next/link";

// Minimal chrome for the forced password-change screen. This route sits
// outside the (auth) group on purpose: its users are already signed in, so
// the public marketing nav (Log In / Get Started) would be wrong here.
export default function ChangePasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto w-full max-w-6xl px-6 py-4">
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
