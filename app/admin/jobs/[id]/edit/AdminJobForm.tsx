"use client";

import { JobForm } from "@/app/business/jobs/JobForm";
import type { JobValues } from "@/app/business/jobs/schemas";
import type { SkillOption } from "@/components/profile/SkillCombobox";

export function AdminJobForm({
  jobId,
  defaultValues,
  skillOptions,
}: {
  jobId: string;
  defaultValues: JobValues;
  skillOptions: SkillOption[];
}) {
  return (
    <JobForm
      mode="edit"
      jobId={jobId}
      defaultValues={defaultValues}
      skillOptions={skillOptions}
      onSave={async () => ({
        success: false,
        error: "Saving job changes from the admin portal is not available yet.",
      })}
    />
  );
}
