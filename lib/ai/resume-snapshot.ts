// The ONE place that decides which resume an application's AI pipelines and
// reviewers see: the snapshot taken at apply time, not the live profile.
//
// Why: the profile's resume fields are replaced on re-upload. Without the
// snapshot a candidate could apply with a clean resume, get questions from it,
// then swap in a loaded one before the interview is graded, and a re-upload
// would also erase the flags attached to applications already submitted.
//
// MIRROR: voice-agent/lib/load_context.py#_resolve_resume does the same for the
// Python tier. If you change one, change the other.
//
// NOTE: no `import "server-only"` and no Prisma import, so plain-tsx scripts
// can load it (same reasoning as load-interview-context.ts).

export interface ResumeSnapshotSource {
  resumeSnapshotAt: Date | null;
  appliedParsedResumeText: string | null;
  appliedCleanedResumeText: string | null;
  appliedResumeFlagsJson: unknown;
  candidateProfile: {
    parsedResumeText: string | null;
    cleanedResumeText: string | null;
    resumeFlagsJson?: unknown;
  };
}

export interface ResolvedResume {
  parsedText: string | null;
  cleanedText: string | null;
  flagsJson: unknown;
  // "profile" only ever means a pre-snapshot application.
  source: "snapshot" | "profile";
}

export function resolveApplicationResume(app: ResumeSnapshotSource): ResolvedResume {
  if (app.resumeSnapshotAt != null) {
    // Snapshot rows are authoritative even where a field is null: null text
    // means the candidate applied with no resume, and must NOT fall through to
    // whatever they uploaded later.
    return {
      parsedText: app.appliedParsedResumeText,
      cleanedText: app.appliedCleanedResumeText,
      flagsJson: app.appliedResumeFlagsJson,
      source: "snapshot",
    };
  }

  // PRE-SNAPSHOT FALLBACK, deliberate: applications created before the
  // snapshot columns existed have resumeSnapshotAt = null and were never
  // backfilled (backfilling would assert a resume was used that may not have
  // been). For those rows only, read the live profile as the code did before.
  return {
    parsedText: app.candidateProfile.parsedResumeText,
    cleanedText: app.candidateProfile.cleanedResumeText,
    flagsJson: app.candidateProfile.resumeFlagsJson ?? null,
    source: "profile",
  };
}
