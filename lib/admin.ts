export type UserNameSource = {
  email: string;
  candidateProfile?: { firstName: string | null; lastName: string | null } | null;
  company?: { name: string } | null;
};

export function userDisplayName(u: UserNameSource): string {
  const fullName = [u.candidateProfile?.firstName, u.candidateProfile?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return fullName || u.company?.name?.trim() || u.email;
}

export const MAX_SEATS_TOTAL = 1000;
