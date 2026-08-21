import { PublicNav } from "@/components/PublicNav";

// Shared layout for the public auth pages (/login, /signup,
// /forgot-password, /reset-password) — full marketing nav on top,
// centered content on the brand canvas.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-brand-canvas font-body text-brand-ink">
      <PublicNav />
      <main className="flex flex-1 items-center justify-center section-x py-8 sm:py-12">
        {children}
      </main>
    </div>
  );
}
