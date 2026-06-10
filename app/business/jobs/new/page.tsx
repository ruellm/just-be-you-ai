import { redirect } from "next/navigation";
import { getCurrentCompany } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { JobForm, EMPTY_JOB } from "../JobForm";

export default async function NewJobPage() {
  const company = await getCurrentCompany();
  if (!company) redirect("/login");

  const skillOptions = await prisma.skill.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
      <h1 className="text-2xl font-semibold">Post a new job</h1>
      <JobForm
        mode="create"
        defaultValues={EMPTY_JOB}
        skillOptions={skillOptions}
      />
    </div>
  );
}
