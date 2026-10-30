import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-10 font-body lg:px-14 lg:py-14">
      <Link
        href="/business/jobs"
        className="inline-flex items-center gap-2 text-subheading font-semibold tracking-[-0.96px] text-brand-primary hover:underline"
      >
        <ArrowLeft className="size-5" /> Back to Jobs
      </Link>
      <JobForm
        mode="create"
        defaultValues={EMPTY_JOB}
        skillOptions={skillOptions}
        title="Post a New Job"
        subtitle="Fill out job details and publish a new listing to start your recruitment process."
      />
    </div>
  );
}
