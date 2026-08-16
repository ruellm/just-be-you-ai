import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { EditCompanyForm } from "./EditCompanyForm";

export default async function AdminEditCompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) notFound();

  return (
    <div className="space-y-6 px-6 py-8 font-body lg:px-14">
      <Link
        href={`/admin/companies/${company.id}`}
        className="inline-flex items-center gap-2 text-xl font-semibold tracking-[-0.5px] text-brand-primary hover:underline"
      >
        <ArrowLeft className="size-5" /> Back to Previous
      </Link>

      <EditCompanyForm
        companyId={company.id}
        company={{
          name: company.name,
          yearFounded: company.yearFounded?.toString() ?? "",
          contactEmail: company.contactEmail ?? "",
          phone: company.phone ?? "",
          headquarters: company.headquarters ?? "",
          type: company.type ?? "",
          industry: company.industry ?? "",
          website: company.website ?? "",
          logoUrl: company.logoUrl ?? "",
          description: company.description ?? "",
        }}
      />
    </div>
  );
}
