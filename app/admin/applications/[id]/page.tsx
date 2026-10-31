import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CircleCheck, CircleX, FileText } from "lucide-react";
import { prisma } from "@/lib/db";
import { userDisplayName } from "@/lib/admin";
import { formatLongDate } from "@/lib/dates";
import { displayAvatarUrl } from "@/lib/profile-format";
import {
  formatDuration,
  parseEvidence,
  parseRubricBreakdown,
  RECOMMENDATION_TEXT_CLASS,
  rubricAverageScore,
  scoreToPercent,
  TIER_LABELS,
  type EvidenceItem,
} from "@/lib/applications";
import { humanizeDimension } from "@/lib/applications";
import { Button } from "@/components/ui/button";
import {
  BTN_PRIMARY,
  ProfileSectionCard,
} from "@/app/candidate/profile/ProfileSectionCard";
import { RubricBreakdown } from "@/components/applications/RubricBreakdown";
import { MatchBanner } from "@/components/applications/MatchBanner";
import { parseMatchSummary } from "@/lib/match/match-display";
import { applicationDisplayTitle } from "@/lib/prescreen";
import { resolveApplicationResume } from "@/lib/ai/resume-snapshot";
import { parseResumeFlags, RESUME_FLAG_LABELS } from "@/lib/integrity-flags";
import {
  ADMIN_CANDIDATE_INCLUDE,
  AdminProfileHeader,
  CandidateProfileSections,
  SectionTitle,
} from "@/components/admin/CandidateProfileSections";
// Reused from the candidate result page (U4) rather than building a second
// ring / stat chip. That page is NOT modified — this is an import only.
import {
  ScoreSummary,
  StatRow,
} from "@/app/(interview)/candidate/applications/[applicationId]/result/ResultCards";
import {
  displayedRecommendation,
  recommendationLabel,
} from "@/lib/recommendation";
import { cn } from "@/lib/utils";

// S9 Part 2 — the admin "User Profile Revealed" view, opened from an
// application row's "View Results" on /admin/users/[id]. Admin-only: no
// anonymization, and the candidate-facing U5 company gate does not apply here.

// Strengths (positive) and Concerns (negative) share one list; only the icon
// and its colour differ.
function EvidenceList({
  items,
  impact,
}: {
  items: EvidenceItem[];
  impact: "positive" | "negative";
}) {
  const Icon = impact === "positive" ? CircleCheck : CircleX;
  return (
    <ul className="space-y-4">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-body text-brand-ink-secondary">
          <Icon
            className={cn(
              "mt-0.5 size-5 shrink-0",
              impact === "positive" ? "text-accent-3" : "text-accent-2"
            )}
          />
          <span>
            <span className="font-medium text-brand-ink">
              {humanizeDimension(item.dimension)}:
            </span>{" "}
            {item.evidence}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default async function AdminApplicationResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      candidateProfile: {
        include: { ...ADMIN_CANDIDATE_INCLUDE, user: true },
      },
      job: { select: { title: true, company: { select: { name: true } } } },
      interviewResult: true,
    },
  });
  if (!application) notFound();

  const profile = application.candidateProfile;
  const user = profile.user;
  const name = userDisplayName({ email: user.email, candidateProfile: profile });
  const avatarUrl = displayAvatarUrl(
    profile.profileImageUrl,
    profile.avatarUrl
  );
  const result = application.interviewResult;
  const resume = resolveApplicationResume(application);
  const resumeFlags = parseResumeFlags(resume.flagsJson);

  // Old mocked rows default passed=false but carry status "passed" — prefer the
  // graded flag, fall back to status (same expression the result page uses).
  const passed = (result?.passed ?? false) || application.status === "passed";
  const breakdown = parseRubricBreakdown(result?.rubricScoresJson);
  const strengths = parseEvidence(result?.strengthsJson);
  const concerns = parseEvidence(result?.concernsJson);
  const fitSummary = (result?.fitSummary ?? "").trim();
  const match = parseMatchSummary(application.matchPercent, application.matchJson);

  const scorePercent = result
    ? result.compositeScore != null
      ? Math.round(result.compositeScore)
      : scoreToPercent(result.score)
    : 0;
  // The shown value follows the pass/fail outcome, not the stored one alone.
  const recommendation = result
    ? displayedRecommendation(result.recommendation, passed)
    : null;
  // Coloured by VALUE: Hire green / Consider amber / Decline red.
  const recommendationClass = recommendation
    ? RECOMMENDATION_TEXT_CLASS[recommendation]
    : "text-brand-ink";
  const averageScore = rubricAverageScore(breakdown);

  return (
    <div className="space-y-6 px-6 py-8 font-body lg:px-14">
      <Link
        href={`/admin/users/${user.id}`}
        className="inline-flex items-center gap-2 text-subheading font-semibold tracking-[-0.5px] text-brand-primary hover:underline"
      >
        <ArrowLeft className="size-5" /> Back to Previous
      </Link>

      <AdminProfileHeader name={name} email={user.email} avatarUrl={avatarUrl} />

      <h2 className="text-section font-semibold text-brand-primary">
        Interview Results
      </h2>

      {!result ? (
        <ProfileSectionCard>
          <SectionTitle>{applicationDisplayTitle(application)}</SectionTitle>
          <p className="text-small text-brand-ink-secondary">
            No interview result yet for this application (status:{" "}
            {application.status}).
          </p>
        </ProfileSectionCard>
      ) : (
        <>
          {/* Score ring + stat chips */}
          <ProfileSectionCard>
            <SectionTitle>{applicationDisplayTitle(application)}</SectionTitle>
            <ScoreSummary percent={scorePercent} passed={passed} columns="wide">
              <StatRow label="Role Tier" value={TIER_LABELS[result.tier]} />
              <StatRow
                label="Recommendation"
                value={recommendationLabel(recommendation)}
                valueClassName={recommendationClass}
              />
              <StatRow
                label="Time Elapsed"
                value={formatDuration(result.durationSeconds)}
              />
              <StatRow
                label="Completed Date"
                value={formatLongDate(result.completedAt)}
              />
              {averageScore ? (
                <StatRow
                  label="Average Score"
                  value={`${averageScore} out of 5`}
                />
              ) : null}
            </ScoreSummary>
          </ProfileSectionCard>

          {fitSummary || match ? (
            <ProfileSectionCard>
              <SectionTitle>Fit Summary</SectionTitle>
              <MatchBanner match={match} />
              {fitSummary ? (
                <p className="text-body whitespace-pre-line text-brand-ink-secondary">
                  {fitSummary}
                </p>
              ) : null}
            </ProfileSectionCard>
          ) : null}

          {strengths.length > 0 ? (
            <ProfileSectionCard>
              <SectionTitle>Strengths</SectionTitle>
              <EvidenceList items={strengths} impact="positive" />
            </ProfileSectionCard>
          ) : null}

          {concerns.length > 0 ? (
            <ProfileSectionCard>
              <SectionTitle>Concerns</SectionTitle>
              <EvidenceList items={concerns} impact="negative" />
            </ProfileSectionCard>
          ) : null}

          {/* Rubric breakdown — the shared business-side component, plus the
              admin-only link across to the generated questions. Renders
              nothing for pre-rubric rows, so the card is omitted then. */}
          {breakdown ? (
            <ProfileSectionCard>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <SectionTitle>Rubric Breakdown</SectionTitle>
                <Button asChild className={BTN_PRIMARY}>
                  <Link href={`/admin/applications/${application.id}/questions`}>
                    <FileText className="size-4" /> View Generated Questions
                  </Link>
                </Button>
              </div>
              <RubricBreakdown
                rubricScoresJson={result.rubricScoresJson}
                compositeScore={result.compositeScore}
                verdict={result.verdict}
                gatesFiredJson={result.gatesFiredJson}
                manipulationAttemptsJson={result.manipulationAttemptsJson}
              />
            </ProfileSectionCard>
          ) : null}
        </>
      )}

      {/* Hidden text found in the resume THIS application was made with (the
          apply-time snapshot), so a later re-upload cannot erase it. Admin
          only: the candidate is never told. */}
      {resumeFlags.length ? (
        <details
          open
          className="rounded-[12px] border border-amber-200 bg-amber-50 text-amber-900"
        >
          <summary className="cursor-pointer px-6 py-4 text-small font-medium">
            Resume integrity flags ({resumeFlags.length}),{" "}
            {resume.source === "snapshot"
              ? "resume as submitted with this application"
              : "candidate's current resume (application predates snapshots)"}
          </summary>
          <ul className="space-y-3 border-t border-amber-200 px-6 py-4 text-small">
            {resumeFlags.map((flag, i) => (
              <li key={i}>
                <p className="font-medium">
                  {RESUME_FLAG_LABELS[flag.signature] ?? flag.signature}
                  {flag.page != null ? `, page ${flag.page}` : ""}
                  {flag.detail ? ` (${flag.detail})` : ""}
                </p>
                {flag.text ? (
                  <p className="mt-0.5 font-mono text-meta whitespace-pre-wrap italic">
                    &ldquo;{flag.text}&rdquo;
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <h2 className="text-section font-semibold text-brand-primary">
        Profile Information
      </h2>
      <CandidateProfileSections profile={profile} joinedAt={user.createdAt} />
    </div>
  );
}
