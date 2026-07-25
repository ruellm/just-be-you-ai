"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentCompany } from "@/lib/auth";
import { fieldErrorsFrom } from "@/lib/zod";
import { jobSchema, type JobActionResult, type JobValues } from "./schemas";

function nullify(value: string): string | null {
  return value.trim() === "" ? null : value.trim();
}
function toIntOrNull(value: string): number | null {
  const t = value.trim();
  return t === "" ? null : Number.parseInt(t, 10);
}

function jobData(d: JobValues) {
  return {
    title: d.title,
    description: d.description,
    roleOverview: nullify(d.roleOverview),
    requirements: nullify(d.requirements),
    dayToDay: nullify(d.dayToDay),
    level: d.level,
    workMode: d.workMode,
    location: nullify(d.location),
    salaryMin: toIntOrNull(d.salaryMin),
    salaryMax: toIntOrNull(d.salaryMax),
    status: d.status,
    interviewHints: nullify(d.interviewHints),
    idealCandidateProfile: nullify(d.idealCandidateProfile),
    passingCriteria: nullify(d.passingCriteria),
    interviewMaxMinutes: toIntOrNull(d.interviewMaxMinutes),
    voiceAgentType: d.voiceAgentType,
  };
}

export async function createJob(values: JobValues): Promise<JobActionResult> {
  const company = await getCurrentCompany();
  if (!company) return { success: false, error: "You are not signed in." };
  if (!company.name.trim()) {
    return {
      success: false,
      error: "Complete your company profile to start posting jobs.",
      redirectTo: "/business/company",
    };
  }

  const parsed = jobSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const d = parsed.data;

  try {
    const job = await prisma.job.create({
      data: {
        ...jobData(d),
        companyId: company.id,
        skills: { create: d.skillIds.map((skillId) => ({ skillId })) },
      },
      select: { id: true },
    });
    revalidatePath("/business/jobs");
    revalidatePath("/business/dashboard");
    return { success: true, jobId: job.id };
  } catch {
    return { success: false, error: "Could not create job. Please try again." };
  }
}

export async function updateJob(
  jobId: string,
  values: JobValues
): Promise<JobActionResult> {
  const company = await getCurrentCompany();
  if (!company) return { success: false, error: "You are not signed in." };

  // Ownership check.
  const owned = await prisma.job.findFirst({
    where: { id: jobId, companyId: company.id },
    select: { id: true },
  });
  if (!owned) return { success: false, error: "Job not found." };

  const parsed = jobSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const d = parsed.data;

  try {
    await prisma.job.update({
      where: { id: jobId },
      data: {
        ...jobData(d),
        skills: {
          deleteMany: {},
          create: d.skillIds.map((skillId) => ({ skillId })),
        },
      },
    });
    revalidatePath("/business/jobs");
    revalidatePath(`/business/jobs/${jobId}`);
    revalidatePath(`/business/jobs/${jobId}/edit`);
    return { success: true, jobId };
  } catch {
    return { success: false, error: "Could not save job. Please try again." };
  }
}

export async function toggleJobStatus(jobId: string): Promise<JobActionResult> {
  const company = await getCurrentCompany();
  if (!company) return { success: false, error: "You are not signed in." };

  const job = await prisma.job.findFirst({
    where: { id: z.string().parse(jobId), companyId: company.id },
    select: { id: true, status: true },
  });
  if (!job) return { success: false, error: "Job not found." };

  await prisma.job.update({
    where: { id: job.id },
    data: { status: job.status === "open" ? "closed" : "open" },
  });
  revalidatePath("/business/jobs");
  revalidatePath(`/business/jobs/${jobId}`);
  return { success: true };
}
