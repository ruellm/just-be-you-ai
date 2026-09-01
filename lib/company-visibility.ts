import type { ApplicationStatus, CandidateTier } from "@prisma/client";

// Hiring-company anonymization (U5).
//
// Source of truth is the pricing page (app/pricing/content.ts):
//   Free         — "Cannot see hiring company details"
//   Professional — "Can see the hiring company upon passing"
//
// So the employer is hidden from EVERY candidate by default and revealed only
// when BOTH conditions hold. This is the single gate: never inline the check or
// the placeholder string at a call site.

/** Shown in place of the employer whenever the gate is closed. */
export const ANONYMOUS_COMPANY_NAME = "Anonymous Company";

/**
 * Did the candidate pass THIS job's interview?
 *
 * Mirrors the expression the result page shows the candidate
 * (`result.passed || application.status === "passed"`): pre-grading mocked rows
 * carry `passed = false` alongside `status = "passed"`, and the gate must agree
 * with what the candidate was told. Keep this the single definition — every
 * call site passes its application row through here.
 */
export function hasPassedApplication(
  application:
    | {
        status: ApplicationStatus;
        interviewResult: { passed: boolean } | null;
      }
    | null
    | undefined
): boolean {
  if (!application) return false;
  return (
    application.interviewResult?.passed === true ||
    application.status === "passed"
  );
}

export function canSeeHiringCompany({
  tier,
  passedThisJob,
}: {
  tier: CandidateTier | null | undefined;
  /** The candidate's application for THIS job has a passed InterviewResult. */
  passedThisJob: boolean;
}): boolean {
  return tier === "professional" && passedThisJob === true;
}

/**
 * The name to display for a job's employer. Returns the real name only when the
 * gate is open; callers must ALSO drop the company object from the payload so
 * the withheld fields are never serialized to the browser.
 */
export function hiringCompanyName(
  realName: string,
  visible: boolean
): string {
  return visible ? realName : ANONYMOUS_COMPANY_NAME;
}
