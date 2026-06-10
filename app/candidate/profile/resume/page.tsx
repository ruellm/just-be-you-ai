import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ResumeSection } from "./ResumeSection";

// resumeUrl is the storage path: `{userId}/{timestamp}-{originalFilename}`.
// We derive the display filename + upload date from it (no extra DB columns).
function parseResumeMeta(path: string | null) {
  if (!path) return null;
  const base = path.split("/").pop() ?? path;
  const dash = base.indexOf("-");
  if (dash === -1) return { filename: base, uploadedAt: null as string | null };
  const ts = Number(base.slice(0, dash));
  const filename = base.slice(dash + 1);
  const uploadedAt =
    Number.isFinite(ts) && ts > 0 ? new Date(ts).toISOString() : null;
  return { filename, uploadedAt };
}

export default async function ResumePage() {
  const user = await getCurrentUser();
  const profile = user
    ? await prisma.candidateProfile.findUnique({
        where: { userId: user.id },
        select: { resumeUrl: true },
      })
    : null;

  const meta = parseResumeMeta(profile?.resumeUrl ?? null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Resume</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Upload your resume as a PDF or DOCX file (up to 5MB).
        </p>
      </div>
      <ResumeSection
        filename={meta?.filename ?? null}
        uploadedAt={meta?.uploadedAt ?? null}
      />
    </div>
  );
}
