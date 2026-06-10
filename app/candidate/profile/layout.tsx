import { ProfileNav } from "@/components/profile/ProfileNav";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const profile = user
    ? await prisma.candidateProfile.findUnique({
        where: { userId: user.id },
        select: { firstName: true, lastName: true },
      })
    : null;

  const fullName = [profile?.firstName, profile?.lastName]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex flex-col gap-8 sm:flex-row">
        <aside className="sm:w-60 sm:shrink-0">
          <div className="mb-4 px-3">
            <p className="font-medium">{fullName || "Your profile"}</p>
            <p className="text-muted-foreground truncate text-sm">
              {user?.email}
            </p>
          </div>
          <ProfileNav />
        </aside>
        <section className="min-w-0 flex-1">{children}</section>
      </div>
    </div>
  );
}
