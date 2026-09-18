"use client";

import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  FileText,
  Info,
  Lock,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  RecommendationBadge,
  StatusBadge,
  TierBadge,
  VerdictBadge,
} from "@/components/applications/Badges";
import { RubricBreakdown } from "@/components/applications/RubricBreakdown";
import type { ApplicationStatus, Level } from "@prisma/client";
import {
  humanizeDimension,
  parseEvidence,
  parseRubricBreakdown,
  scoreToPercent,
} from "@/lib/applications";
import { parseResumeMeta } from "@/lib/profile-format";
import { cn } from "@/lib/utils";
import { getCandidateResumeSignedUrl, unlockCandidateProfile } from "./actions";
import { COMPANY_SEAT_INFO, formatSeatsLeft } from "@/lib/interview-seats";

export type InterviewResultDTO = {
  score: number;
  tier: Level;
  recommendation: string | null;
  fitSummary: string;
  strengthsJson: unknown;
  concernsJson: unknown;
  rubricScoresJson: unknown;
  compositeScore: number | null;
  verdict: string | null;
  gatesFiredJson: unknown;
  manipulationAttemptsJson: unknown;
  transcript: string | null;
  completedAt: string;
};

export type ApplicationDTO = {
  id: string;
  status: ApplicationStatus;
  jobTitle: string;
  interviewResult: InterviewResultDTO | null;
};

export type ProfileDTO = {
  id: string;
  fullName: string;
  initials: string;
  avatarUrl: string | null;
  email: string;
  resumeUrl: string | null;
  country: string | null;
  city: string | null;
  nationality: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  expectedSalary: number | null;
  totalYearsExperience: number | null;
  preferredRole: string | null;
  languages: string[];
  joinedAt: string;
  summary: string | null;
  skills: { id: string; name: string; years: number }[];
  workExperiences: {
    id: string;
    position: string;
    companyName: string;
    employmentType: string;
    startDate: string | null;
    endDate: string | null;
    currentlyWorking: boolean;
    description: string | null;
  }[];
  educations: {
    id: string;
    school: string;
    degree: string | null;
    fieldOfStudy: string | null;
    country: string | null;
    startDate: string | null;
    endDate: string | null;
    currentlyStudying: boolean;
  }[];
  projects: {
    id: string;
    name: string;
    description: string | null;
    startDate: string | null;
    endDate: string | null;
    ongoing: boolean;
    skills: string[];
  }[];
};

function anonymousNumber(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 900;
  return 100 + h;
}

function monthLabel(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function dateRange(
  start: string | null,
  end: string | null,
  present: boolean
): string {
  const s = monthLabel(start);
  const e = present ? "Present" : monthLabel(end);
  return [s, e].filter(Boolean).join(" – ");
}

function longDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const CARD_CLASS =
  "rounded-[12px] border border-brand-border bg-brand-surface p-6 sm:p-7";
const CARD_TITLE_CLASS =
  "text-heading font-semibold tracking-[-0.5px] text-brand-primary";

function Card({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn(CARD_CLASS, "space-y-4", className)}>
      {title ? <h3 className={CARD_TITLE_CLASS}>{title}</h3> : null}
      {children}
    </section>
  );
}

function LockedPanel({
  caption,
  onUnlock,
  className,
}: {
  caption: string;
  onUnlock: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-[8px] bg-tag-2 px-6 py-8 text-center backdrop-blur-[1px]",
        className
      )}
    >
      <Lock className="size-9 text-brand-tertiary" strokeWidth={1.75} />
      <p className="text-body font-medium tracking-[-0.5px] text-white">
        {caption}
      </p>
      <Button
        type="button"
        onClick={onUnlock}
        className="h-[39px] w-full max-w-[386px] rounded-[12px] bg-brand-tertiary px-6 text-body font-medium tracking-[-0.5px] text-brand-ink hover:bg-brand-tertiary/90"
      >
        Use 1 Seat Credit to Unlock Profile
      </Button>
    </div>
  );
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  if (value == null || value === "") return null;
  return (
    <div className="min-w-0">
      <dt className="text-meta font-semibold text-brand-ink">{label}</dt>
      <dd className="truncate text-small text-brand-ink-secondary">{value}</dd>
    </div>
  );
}

function ResultTag({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "success" | "neutral";
}) {
  return (
    <span
      className={cn(
        "inline-flex h-[27px] items-center rounded-[6px] px-3 text-small text-brand-canvas",
        tone === "success" ? "bg-accent-3" : "bg-brand-ink-sidebar"
      )}
    >
      {children}
    </span>
  );
}

function ResultRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-body text-brand-ink-secondary">{label}</span>
      <span className="flex flex-wrap items-center justify-end gap-2">
        {children}
      </span>
    </div>
  );
}

function EvidenceCard({
  title,
  items,
  impact,
}: {
  title: string;
  items: { dimension: string; evidence: string }[];
  impact: "positive" | "negative";
}) {
  const Icon = impact === "positive" ? CheckCircle2 : XCircle;
  return (
    <Card title={title}>
      {items.length === 0 ? (
        <p className="text-body text-brand-ink-secondary">None noted.</p>
      ) : (
        <ul className="space-y-4">
          {items.map((item, i) => (
            <li key={i} className="flex gap-3 text-body text-brand-ink">
              <Icon
                className={cn(
                  "mt-0.5 size-5 shrink-0",
                  impact === "positive" ? "text-accent-3" : "text-accent-2"
                )}
              />
              <span>
                {humanizeDimension(item.dimension)}: {item.evidence}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function ResumeCard({
  profile,
  onUnlock,
}: {
  profile: ProfileDTO | null;
  onUnlock: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const meta = profile ? parseResumeMeta(profile.resumeUrl) : null;

  function open(download: boolean) {
    if (!profile) return;
    startTransition(async () => {
      const result = await getCandidateResumeSignedUrl(profile.id);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      const url =
        download && meta
          ? `${result.url}&download=${encodeURIComponent(meta.filename)}`
          : result.url;
      window.open(url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <Card title="Resume">
      {!profile ? (
        <LockedPanel caption="Unlock to View Resume" onUnlock={onUnlock} />
      ) : meta ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-[12px] border border-brand-border bg-brand-surface px-4 py-3">
            <FileText className="size-8 shrink-0 text-brand-ink-secondary" strokeWidth={1.5} />
            <div className="min-w-0">
              <p className="truncate text-small font-semibold text-brand-ink">
                {meta.filename}
              </p>
              {meta.uploadedAt ? (
                <p className="text-meta text-brand-ink-secondary">
                  Uploaded on {longDate(meta.uploadedAt)}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              onClick={() => open(false)}
              disabled={pending}
              className="h-9 w-full rounded-[8px] bg-brand-ink text-small font-semibold text-white hover:bg-brand-ink/90"
            >
              View in New Tab
            </Button>
            <Button
              type="button"
              onClick={() => open(true)}
              disabled={pending}
              className="h-9 w-full rounded-[8px] bg-brand-secondary text-small font-semibold text-white hover:bg-brand-secondary/90"
            >
              Download Resume
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-body text-brand-ink-secondary">No resume on file.</p>
      )}
    </Card>
  );
}

function ApplicationResults({ app }: { app: ApplicationDTO }) {
  const r = app.interviewResult;
  if (!r) {
    return (
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className={CARD_TITLE_CLASS}>{app.jobTitle}</h3>
          <StatusBadge status={app.status} />
        </div>
        <p className="text-body text-brand-ink-secondary">
          Interview not completed yet.
        </p>
      </Card>
    );
  }
  const hasRubric = parseRubricBreakdown(r.rubricScoresJson) != null;
  const passed = app.status === "passed";
  const strengths = parseEvidence(r.strengthsJson);
  const concerns = parseEvidence(r.concernsJson);
  const summary = r.fitSummary.trim();

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <Card>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className={CARD_TITLE_CLASS}>{app.jobTitle}</h3>
              <StatusBadge status={app.status} />
            </div>
            <div className="space-y-3">
              {hasRubric ? (
                <ResultRow label="Verdict">
                  <VerdictBadge verdict={r.verdict} />
                </ResultRow>
              ) : (
                <ResultRow label="Tier">
                  <TierBadge tier={r.tier} />
                </ResultRow>
              )}
              <ResultRow label="Score">
                <ResultTag tone={passed ? "success" : "neutral"}>
                  {hasRubric && r.compositeScore != null
                    ? `${r.compositeScore}/100`
                    : `${scoreToPercent(r.score)}%`}
                </ResultTag>
              </ResultRow>
              <ResultRow label="Recommendation">
                <RecommendationBadge recommendation={r.recommendation} />
                <ResultTag tone={passed ? "success" : "neutral"}>
                  {passed ? "Passed" : app.status === "failed" ? "Failed" : "Pending"}
                </ResultTag>
              </ResultRow>
            </div>
            <p className="text-meta text-brand-ink-secondary">
              Completed {longDate(r.completedAt)}
            </p>
          </Card>
          <EvidenceCard title="Strengths" items={strengths} impact="positive" />
        </div>
        <div className="space-y-5">
          <Card title="Fit Summary">
            <p className="text-body whitespace-pre-line text-brand-ink">
              {summary || "No summary available."}
            </p>
          </Card>
          <EvidenceCard title="Concerns" items={concerns} impact="negative" />
        </div>
      </div>

      {hasRubric ? (
        <Card title="Rubric Breakdown">
          <RubricBreakdown
            rubricScoresJson={r.rubricScoresJson}
            compositeScore={r.compositeScore}
            verdict={r.verdict}
            gatesFiredJson={r.gatesFiredJson}
            manipulationAttemptsJson={r.manipulationAttemptsJson}
          />
        </Card>
      ) : null}

      {r.transcript != null ? (
        <Card>
          <details>
            <summary className="cursor-pointer text-body font-semibold text-brand-primary">
              View transcript
            </summary>
            <p className="mt-3 text-small whitespace-pre-line text-brand-ink-secondary">
              {r.transcript}
            </p>
          </details>
        </Card>
      ) : null}
    </div>
  );
}

export function CandidateProfileView({
  candidateProfileId,
  profile,
  applications,
  backHref,
  seatsRemaining,
  seatsTotal,
}: {
  candidateProfileId: string;
  profile: ProfileDTO | null;
  applications: ApplicationDTO[];
  backHref: string;
  seatsRemaining: number;
  seatsTotal: number;
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [insufficient, setInsufficient] = useState(false);
  const [pending, startTransition] = useTransition();
  const noSeats = seatsRemaining === 0 || insufficient;
  const openModal = () => setModalOpen(true);

  function confirmUnlock() {
    startTransition(async () => {
      const result = await unlockCandidateProfile(candidateProfileId);
      if (result.ok) {
        setModalOpen(false);
        router.refresh();
        return;
      }
      if (result.reason === "insufficient_seats") {
        setInsufficient(true);
        return;
      }
      toast.error(result.error);
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-10 font-body lg:px-14 lg:py-14">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-subheading font-semibold tracking-[-0.96px] text-brand-primary hover:underline"
      >
        <ArrowLeft className="size-5" /> Back to Previous
      </Link>

      <div className="flex items-center gap-4">
        {!profile ? (
          <div className="flex size-[60px] shrink-0 items-center justify-center rounded-[8px] bg-brand-secondary/10">
            <Building2 className="size-9 text-brand-secondary" strokeWidth={1.5} />
          </div>
        ) : (
          <Avatar className="size-[60px] rounded-[8px] after:rounded-[8px] after:border-brand-border">
            {profile.avatarUrl ? (
              <AvatarImage src={profile.avatarUrl} alt="" className="rounded-[8px]" />
            ) : null}
            <AvatarFallback className="rounded-[8px] bg-brand-container text-subheading font-semibold text-brand-primary">
              {profile.initials}
            </AvatarFallback>
          </Avatar>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-section font-semibold tracking-[-0.5px] text-brand-primary">
            {!profile
              ? `Anonymous User ${anonymousNumber(candidateProfileId)}`
              : profile.fullName}
          </h1>
          <p className="truncate text-body tracking-[-0.5px] text-brand-ink-secondary">
            {!profile ? "Anonymous Email" : profile.email}
          </p>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className={CARD_TITLE_CLASS}>Interview Results</h2>
        {applications.map((app) => (
          <ApplicationResults key={app.id} app={app} />
        ))}
        <div className="grid gap-5 lg:grid-cols-2">
          <ResumeCard profile={profile} onUnlock={openModal} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className={CARD_TITLE_CLASS}>Profile Information</h2>
        {!profile ? (
          <LockedPanel
            caption="Unlock to View Profile"
            onUnlock={openModal}
            className="min-h-[201px]"
          />
        ) : (
          <div className="space-y-5">
            <Card title="Basic Information">
              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Country of Residence" value={profile.country} />
                <Field label="City" value={profile.city} />
                <Field label="Nationality" value={profile.nationality} />
                <Field label="Phone" value={profile.phone} />
                <Field
                  label="LinkedIn URL"
                  value={
                    profile.linkedinUrl ? (
                      <a
                        href={profile.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-brand-secondary hover:underline"
                      >
                        {profile.linkedinUrl}
                      </a>
                    ) : null
                  }
                />
                <Field
                  label="Expected Salary (PHP / month)"
                  value={
                    profile.expectedSalary != null
                      ? profile.expectedSalary.toLocaleString("en-PH")
                      : null
                  }
                />
                <Field
                  label="Total Years of Experience"
                  value={
                    profile.totalYearsExperience != null
                      ? String(profile.totalYearsExperience)
                      : null
                  }
                />
                <Field label="Joined Date" value={longDate(profile.joinedAt)} />
                <Field label="Preferred Role" value={profile.preferredRole} />
                <Field
                  label="Languages"
                  value={profile.languages.length ? profile.languages.join(", ") : null}
                />
              </dl>
            </Card>

            {profile.summary ? (
              <Card title="Profile Summary">
                <p className="text-body whitespace-pre-line text-brand-ink">
                  {profile.summary}
                </p>
              </Card>
            ) : null}

            {profile.workExperiences.length ? (
              <Card title="Work Experience">
                <div className="space-y-4">
                  {profile.workExperiences.map((w) => (
                    <div
                      key={w.id}
                      className="space-y-2 rounded-[12px] border border-brand-border p-4"
                    >
                      <div>
                        <p className="text-body font-semibold text-brand-ink">
                          {w.position}
                        </p>
                        <p className="text-small text-brand-ink-secondary">
                          {w.companyName} • {w.employmentType}
                        </p>
                        <p className="text-small text-brand-ink-secondary">
                          {dateRange(w.startDate, w.endDate, w.currentlyWorking)}
                        </p>
                      </div>
                      {w.description ? (
                        <p className="text-small whitespace-pre-line text-brand-ink">
                          {w.description}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}

            {profile.skills.length ? (
              <Card title="Skills">
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((s) => (
                    <span
                      key={s.id}
                      className="inline-flex h-6 items-center rounded-[6px] bg-tag-1 px-2.5 text-meta text-brand-ink"
                    >
                      {s.name} • {s.years}y
                    </span>
                  ))}
                </div>
              </Card>
            ) : null}

            {profile.educations.length ? (
              <Card title="Education">
                <div className="space-y-4">
                  {profile.educations.map((e) => (
                    <div
                      key={e.id}
                      className="rounded-[12px] border border-brand-border p-4"
                    >
                      <p className="text-body font-semibold text-brand-ink">
                        {e.school}
                      </p>
                      <p className="text-small text-brand-ink-secondary">
                        {[e.degree, e.fieldOfStudy].filter(Boolean).join(", ")}
                      </p>
                      <p className="text-small text-brand-ink-secondary">
                        {[
                          e.country,
                          dateRange(e.startDate, e.endDate, e.currentlyStudying),
                        ]
                          .filter(Boolean)
                          .join(" • ")}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}

            {profile.projects.length ? (
              <Card title="Projects">
                <div className="space-y-4">
                  {profile.projects.map((p) => (
                    <div
                      key={p.id}
                      className="space-y-2 rounded-[12px] border border-brand-border p-4"
                    >
                      <div>
                        <p className="text-body font-semibold text-brand-ink">
                          {p.name}
                        </p>
                        <p className="text-small text-brand-ink-secondary">
                          {dateRange(p.startDate, p.endDate, p.ongoing)}
                        </p>
                      </div>
                      {p.description ? (
                        <p className="text-small whitespace-pre-line text-brand-ink">
                          {p.description}
                        </p>
                      ) : null}
                      {p.skills.length ? (
                        <div className="flex flex-wrap gap-2">
                          {p.skills.map((name) => (
                            <span
                              key={name}
                              className="inline-flex h-6 items-center rounded-[6px] bg-tag-1 px-2.5 text-meta text-brand-ink"
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}
          </div>
        )}
      </section>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent
          showCloseButton={false}
          className="w-full max-w-[calc(100%-2rem)] gap-0 rounded-[16px] bg-brand-surface p-6 font-body ring-0 shadow-[0_10px_7.5px_rgba(0,0,0,0.1),0_4px_3px_rgba(0,0,0,0.1)] sm:max-w-[538px]"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-5">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-brand-secondary">
                <Lock className="size-5 text-white" />
              </div>
              <DialogTitle className="text-subheading font-semibold tracking-[-0.5px] text-brand-primary">
                Unlock Full Candidate Profile
              </DialogTitle>
            </div>
            <DialogClose
              aria-label="Close"
              className="text-lg leading-none text-brand-ink hover:text-brand-primary"
            >
              ×
            </DialogClose>
          </div>
          <DialogDescription className="pt-4 text-small text-brand-ink">
            Revealing this candidate&apos;s identity and interview details will
            consume 1 seat credit from your balance.
          </DialogDescription>
          <div className="mt-4 flex items-center justify-between rounded-[12px] border-[0.8px] border-brand-border bg-brand-container px-4 py-3 text-small">
            <span className="font-medium text-brand-ink-secondary">
              Current Balance
            </span>
            <span className="font-semibold text-brand-ink">
              {formatSeatsLeft(seatsRemaining, seatsTotal)}
            </span>
          </div>
          <p className="mt-3 flex items-start gap-2 text-meta text-brand-ink-secondary">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            {COMPANY_SEAT_INFO}
          </p>
          {noSeats ? (
            <p className="mt-3 text-small font-medium text-accent-2">
              Not enough seats. You have 0 of {seatsTotal} seats left and
              cannot unlock more profiles right now.
            </p>
          ) : null}
          <div className="mt-5 flex items-center justify-end gap-3">
            <DialogClose asChild>
              <Button
                type="button"
                variant="ghost"
                className="h-9 rounded-[8px] px-5 text-small font-medium text-brand-ink hover:bg-brand-container"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              onClick={confirmUnlock}
              disabled={pending || noSeats}
              className="h-10 rounded-[12px] bg-brand-secondary px-5 text-small font-semibold text-white hover:bg-brand-secondary/90"
            >
              {pending ? "Unlocking…" : "Unlock Profile (-1)"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
