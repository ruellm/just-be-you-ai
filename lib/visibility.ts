import type { Prisma } from "@prisma/client";

// Admin-hidden accounts. A hidden candidate does not exist for companies; a
// hidden company's jobs do not exist for candidates. Spread these into every
// business-side candidate/application read and every candidate-side job read
// so a new query cannot forget the rule. Admin pages read everything and show
// a Hidden badge instead; candidates always see their own history.

export const visibleCandidateWhere = {
  hiddenAt: null,
} satisfies Prisma.CandidateProfileWhereInput;

export const visibleJobWhere = {
  company: { hiddenAt: null },
} satisfies Prisma.JobWhereInput;

// Application filter for business-side reads.
export const visibleApplicantWhere = {
  candidateProfile: visibleCandidateWhere,
} satisfies Prisma.ApplicationWhereInput;
