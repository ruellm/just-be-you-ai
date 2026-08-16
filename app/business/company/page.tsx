import { getCurrentCompany } from "@/lib/auth";
import { CompanyForm } from "./CompanyForm";
import type { CompanyValues } from "./schemas";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((p) => p.charAt(0).toUpperCase());
  return letters.join("") || "?";
}

// Company profile editor (Figma frame "Companies"): stacked section cards +
// the sticky Save bar, mirroring the candidate profile page.
export default async function CompanyPage() {
  const company = await getCurrentCompany();

  const defaults: CompanyValues = {
    name: company?.name ?? "",
    description: company?.description ?? "",
    website: company?.website ?? "",
    logoUrl: company?.logoUrl ?? "",
    yearFounded: company?.yearFounded != null ? String(company.yearFounded) : "",
    contactEmail: company?.contactEmail ?? "",
    phone: company?.phone ?? "",
    headquarters: company?.headquarters ?? "",
    type: company?.type ?? "",
    industry: company?.industry ?? "",
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-10 pb-32 font-body lg:px-14 lg:py-14 lg:pb-32">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-brand-primary sm:text-4xl">
          Company Profile
        </h1>
        <p className="text-base text-brand-ink-secondary">
          This is what candidates see on your job posts.
        </p>
      </div>
      <CompanyForm
        defaultValues={defaults}
        initials={initialsOf(company?.name ?? "")}
      />
    </div>
  );
}
