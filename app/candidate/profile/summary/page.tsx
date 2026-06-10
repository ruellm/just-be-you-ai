import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SummaryForm } from "./SummaryForm";

export default async function SummaryPage() {
  const user = await getCurrentUser();
  const profile = user
    ? await prisma.candidateProfile.findUnique({
        where: { userId: user.id },
        select: { summary: true },
      })
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Profile summary</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          A short intro shown at the top of your profile.
        </p>
      </div>
      <SummaryForm defaultValue={profile?.summary ?? ""} />
    </div>
  );
}
