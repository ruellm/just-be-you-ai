import { getCurrentCompany } from "@/lib/auth";
import { CompanyForm } from "./CompanyForm";
import type { CompanyValues } from "./schemas";

export default async function CompanyPage() {
  const company = await getCurrentCompany();

  const defaults: CompanyValues = {
    name: company?.name ?? "",
    description: company?.description ?? "",
    website: company?.website ?? "",
    logoUrl: company?.logoUrl ?? "",
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <div>
        <h1 className="text-2xl font-semibold">Company profile</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          This is what candidates see on your job posts.
        </p>
      </div>
      <CompanyForm defaultValues={defaults} />
    </div>
  );
}
