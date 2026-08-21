import { redirect } from "next/navigation";
import { CandidateSidebar } from "@/components/candidate/CandidateSidebar";
import { getCurrentDbUser, getDashboardPath } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getInterviewSeatBalance } from "@/lib/interview-seats";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((p) => p.charAt(0).toUpperCase());
  return letters.join("") || "?";
}

export default async function CandidateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) redirect("/login");
  if (dbUser.requiresPasswordChange) redirect("/change-password");
  if (dbUser.role !== "candidate") {
    redirect(getDashboardPath(dbUser.role));
  }

  const profile = await prisma.candidateProfile.findUnique({
    where: { userId: dbUser.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      preferredRole: true,
      avatarUrl: true,
    },
  });
  const seatBalance = profile
    ? await getInterviewSeatBalance(prisma, profile.id)
    : null;
  const seatsTotal = seatBalance?.total ?? 0;
  const seatsRemaining = seatBalance?.remaining ?? 0;
  const fullName = [profile?.firstName, profile?.lastName]
    .filter(Boolean)
    .join(" ");
  const displayName = fullName || dbUser.email.split("@")[0] || "Candidate";

  return (
    <div className="min-h-screen bg-brand-canvas">
      <CandidateSidebar
        name={displayName}
        initials={initialsOf(displayName)}
        avatarUrl={profile?.avatarUrl ?? null}
        jobTitle={profile?.preferredRole ?? null}
        seatsRemaining={seatsRemaining}
        seatsTotal={seatsTotal}
      />
      {/* Content sits to the right of the fixed 255px sidebar on lg+. */}
      <main className="min-w-0 lg:pl-[255px]">{children}</main>
    </div>
  );
}
