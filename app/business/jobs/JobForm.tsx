"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ProjectSkillsPicker } from "@/components/profile/ProjectSkillsPicker";
import type { SkillOption } from "@/components/profile/SkillCombobox";
import { ProfileSectionCard } from "@/app/candidate/profile/ProfileSectionCard";
import { LEVELS, LEVEL_LABELS, WORK_MODES, WORK_MODE_LABELS } from "@/lib/jobs";
import { RUBRIC } from "@/lib/ai/rubric";
import { cn } from "@/lib/utils";
import {
  jobSchema,
  JOB_TEXT_LIMITS,
  type JobActionResult,
  type JobValues,
} from "./schemas";
import { createJob, updateJob } from "./actions";

export const EMPTY_JOB: JobValues = {
  title: "",
  description: "",
  roleOverview: "",
  requirements: "",
  dayToDay: "",
  level: "entry",
  workMode: "onsite",
  location: "",
  salaryMin: "",
  salaryMax: "",
  status: "open",
  skillIds: [],
  interviewHints: "",
  idealCandidateProfile: "",
  passingCriteria: "",
  interviewMaxMinutes: "",
  voiceAgentType: "basic",
  passingBar: "selective",
  // Pre-check the rubric's default must-have set for new jobs.
  mustHaveCriteria: [...RUBRIC.defaultMustHave],
};

const VOICE_AGENT_OPTIONS = [
  {
    value: "basic",
    label: "Basic AI Interview",
    help: "Best for initial screening and entry-to-mid-level roles. Focuses on fixed, predefined questions to verify essential skills.",
  },
  {
    value: "advanced",
    label: "Advanced AI Interview",
    help: "Adaptive, real-time conversational AI that dives deeper into technical skills, problem-solving, and scenario-based responses.",
  },
] as const;

const PASSING_BAR_OPTIONS = [
  {
    value: "standard",
    label: "Standard",
    help: "Candidates who solidly meet expectations pass. Best when the role is harder to fill.",
  },
  {
    value: "selective",
    label: "Selective",
    help: "Only strong candidates pass. A candidate who merely meets expectations across the board will not pass. Best when you can be choosy.",
  },
] as const;

const AI_TEXT_SECTIONS: {
  name: "interviewHints" | "idealCandidateProfile" | "passingCriteria";
  label: string;
  placeholder: string;
}[] = [
  {
    name: "interviewHints",
    label: "Interview Hints",
    placeholder:
      "What questions or topics should the AI cover? Provide examples or topics. e.g. “Ask about state management in React. Probe for understanding of when to use Redux versus Context. A strong candidate explains tradeoffs.”",
  },
  {
    name: "idealCandidateProfile",
    label: "Ideal Candidate Profile",
    placeholder:
      "Describe the kind of person you want. Skills, traits, work ethic, values. e.g. “Someone who explains tradeoffs, admits gaps, and asks clarifying questions.”",
  },
  {
    name: "passingCriteria",
    label: "Passing Criteria",
    placeholder:
      "In your own words, what does a passing candidate look like? e.g. “Can explain at least one past project in technical depth and demonstrates curiosity by asking thoughtful questions back.”",
  },
];

const PAGE_1_FIELDS: (keyof JobValues)[] = [
  "title",
  "location",
  "level",
  "workMode",
  "status",
  "salaryMin",
  "salaryMax",
  "skillIds",
  "description",
  "roleOverview",
  "dayToDay",
  "requirements",
];

const INPUT_CLASS =
  "h-9 rounded-[8px] border-brand-border bg-brand-surface font-body text-small text-brand-ink shadow-none placeholder:text-brand-ink-secondary";
const LABEL_CLASS = "font-body text-small font-semibold text-brand-ink";
const CARD_TITLE_CLASS =
  "font-body text-heading font-semibold tracking-[-0.5px] text-brand-primary";

function Req() {
  return (
    <span aria-hidden className="text-accent-2">
      *
    </span>
  );
}

const TEXT_SECTIONS: {
  name: keyof typeof JOB_TEXT_LIMITS;
  title: string;
}[] = [
  { name: "description", title: "Job Description" },
  { name: "roleOverview", title: "Role Overview" },
  { name: "dayToDay", title: "What does day-to-day look like" },
  { name: "requirements", title: "Requirements" },
];

export function JobForm({
  mode,
  jobId,
  defaultValues,
  skillOptions,
  onSave,
}: {
  mode: "create" | "edit";
  jobId?: string;
  defaultValues: JobValues;
  skillOptions: SkillOption[];
  onSave?: (values: JobValues) => Promise<JobActionResult>;
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const form = useForm<JobValues>({
    resolver: zodResolver(jobSchema),
    defaultValues,
  });

  async function nextPage() {
    const ok = await form.trigger(PAGE_1_FIELDS);
    if (ok) {
      setStep(2);
      window.scrollTo({ top: 0 });
    }
  }

  async function onSubmit(values: JobValues) {
    const result = onSave
      ? await onSave(values)
      : mode === "create"
        ? await createJob(values)
        : await updateJob(jobId as string, values);

    if (result.success) {
      if (mode === "create" && result.jobId) {
        toast.success("Job posted");
        router.push(`/business/jobs/${result.jobId}`);
      } else {
        toast.success("Job updated");
        form.reset(values);
      }
      return;
    }

    if (result.redirectTo) {
      toast.error(result.error ?? "Could not continue.");
      router.push(result.redirectTo);
      return;
    }
    if (result.fieldErrors) {
      const errors = result.fieldErrors;
      for (const [field, message] of Object.entries(errors)) {
        form.setError(field as keyof JobValues, { message });
      }
      if (PAGE_1_FIELDS.some((f) => f in errors)) setStep(1);
    }
    toast.error(result.error ?? "Could not save your changes.");
  }

  const selectField = (
    name: "level" | "workMode" | "status",
    label: string,
    options: { value: string; label: string }[]
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className={LABEL_CLASS}>{label}</FormLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger className={cn(INPUT_CLASS, "w-full")}>
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent className="rounded-[8px] border-brand-border font-body">
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 font-body">
        {step === 1 ? (
          <>
            <ProfileSectionCard>
              <h2 className={CARD_TITLE_CLASS}>Basic Information</h2>

              <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL_CLASS}>
                        Job Title <Req />
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Senior Frontend Developer"
                          className={INPUT_CLASS}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL_CLASS}>Location</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Makati, Metro Manila"
                          className={INPUT_CLASS}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-[315fr_266fr_381fr]">
                {selectField(
                  "level",
                  "Level",
                  LEVELS.map((l) => ({ value: l, label: LEVEL_LABELS[l] }))
                )}
                {selectField(
                  "workMode",
                  "Work Mode",
                  WORK_MODES.map((m) => ({ value: m, label: WORK_MODE_LABELS[m] }))
                )}
                {selectField("status", "Status", [
                  { value: "open", label: "Open" },
                  { value: "closed", label: "Closed" },
                ])}
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="salaryMin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL_CLASS}>
                        Salary Min (PHP / month)
                      </FormLabel>
                      <FormControl>
                        <Input
                          inputMode="numeric"
                          placeholder="50000"
                          className={INPUT_CLASS}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="salaryMax"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL_CLASS}>
                        Salary Max (PHP / month)
                      </FormLabel>
                      <FormControl>
                        <Input
                          inputMode="numeric"
                          placeholder="80000"
                          className={INPUT_CLASS}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="skillIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL_CLASS}>Required Skills</FormLabel>
                    <ProjectSkillsPicker
                      skills={skillOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Add a required skill…"
                      triggerClassName={cn(
                        INPUT_CLASS,
                        "w-full font-normal hover:bg-brand-surface data-[state=open]:bg-brand-surface"
                      )}
                      chipClassName="h-[26px] rounded-[6px] border-transparent bg-tag-1 px-2.5 font-body text-meta font-normal text-brand-ink hover:bg-tag-1"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </ProfileSectionCard>

            {TEXT_SECTIONS.map(({ name, title }) => (
              <ProfileSectionCard key={name}>
                <h2 className={CARD_TITLE_CLASS}>{title}</h2>
                <FormField
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          maxLength={JOB_TEXT_LIMITS[name]}
                          className="min-h-[97px] resize-y rounded-[12px] border-brand-border bg-brand-surface font-body text-small text-brand-ink shadow-none"
                          {...field}
                        />
                      </FormControl>
                      <div className="flex items-start justify-between gap-4">
                        <FormMessage />
                        <p
                          className={cn(
                            "ml-auto text-meta",
                            field.value.length > JOB_TEXT_LIMITS[name]
                              ? "text-accent-2"
                              : "text-brand-ink-secondary"
                          )}
                        >
                          {field.value.length}/{JOB_TEXT_LIMITS[name]} characters
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
              </ProfileSectionCard>
            ))}

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
              <p className="text-meta text-brand-ink-secondary">Page 1 of 2</p>
              <Button
                type="button"
                onClick={nextPage}
                className="h-9 rounded-[8px] bg-brand-secondary px-8 text-small font-semibold text-brand-canvas hover:bg-brand-secondary/90"
              >
                Next Page
              </Button>
              <span />
            </div>
          </>
        ) : (
          <>
            <ProfileSectionCard>
              <div className="space-y-2">
                <h2 className={CARD_TITLE_CLASS}>
                  AI Interview Configuration (Optional)
                </h2>
                <p className="text-body text-brand-ink-secondary">
                  These fields guide the AI interviewer to produce better, more
                  relevant questions. They&apos;re optional — the AI will still
                  generate questions without them, but providing detail here
                  significantly improves quality.
                </p>
              </div>

              <FormField
                control={form.control}
                name="voiceAgentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL_CLASS}>Interview Type</FormLabel>
                    <FormControl>
                      <OptionCards
                        value={field.value}
                        onChange={field.onChange}
                        options={VOICE_AGENT_OPTIONS}
                        minHeightClass="min-h-[113px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {AI_TEXT_SECTIONS.map(({ name, label, placeholder }) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL_CLASS}>{label}</FormLabel>
                      <FormControl>
                        <Textarea
                          maxLength={JOB_TEXT_LIMITS[name]}
                          placeholder={placeholder}
                          className="min-h-[76px] resize-y rounded-[12px] border-brand-border bg-brand-surface font-body text-small text-brand-ink shadow-none placeholder:text-brand-ink-secondary"
                          {...field}
                        />
                      </FormControl>
                      <div className="flex items-start justify-between gap-4">
                        <FormMessage />
                        <p
                          className={cn(
                            "ml-auto text-meta",
                            field.value.length > JOB_TEXT_LIMITS[name]
                              ? "text-accent-2"
                              : "text-brand-ink-secondary"
                          )}
                        >
                          {field.value.length}/{JOB_TEXT_LIMITS[name]} characters
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
              ))}

              <FormField
                control={form.control}
                name="passingBar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL_CLASS}>Passing Bar</FormLabel>
                    <FormControl>
                      <OptionCards
                        value={field.value}
                        onChange={field.onChange}
                        options={PASSING_BAR_OPTIONS}
                        minHeightClass="min-h-[127px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="interviewMaxMinutes"
                render={({ field }) => (
                  <FormItem className="max-w-[313px]">
                    <FormLabel className={LABEL_CLASS}>
                      Maximum Interview Duration (Minutes)
                    </FormLabel>
                    <FormControl>
                      <Input
                        inputMode="numeric"
                        min={5}
                        max={60}
                        placeholder="30"
                        className={cn(INPUT_CLASS, "h-[38px] rounded-[12px]")}
                        {...field}
                      />
                    </FormControl>
                    <p className="text-meta text-brand-ink-secondary">
                      Leave blank for default (30 minutes). Recommend: 15-20 for
                      most roles.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </ProfileSectionCard>

            <ProfileSectionCard>
              <div className="space-y-2">
                <h2 className={CARD_TITLE_CLASS}>Must-have Criteria</h2>
                <p className="text-body text-brand-ink-secondary">
                  If a candidate scores very low on a must-have skill, they
                  cannot receive a Pass regardless of their overall score.
                </p>
              </div>
              <FormField
                control={form.control}
                name="mustHaveCriteria"
                render={({ field }) => (
                  <FormItem>
                    <div className="space-y-5">
                      {RUBRIC.categories.map((category) => (
                        <div key={category.key} className="space-y-2">
                          <p className={LABEL_CLASS}>{category.displayName}</p>
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {category.subCriteria.map((sub) => (
                              <label
                                key={sub.key}
                                className="flex cursor-pointer items-center gap-3 text-small text-brand-ink"
                              >
                                <Checkbox
                                  checked={field.value.includes(sub.key)}
                                  onCheckedChange={(checked) =>
                                    field.onChange(
                                      checked === true
                                        ? [...field.value, sub.key]
                                        : field.value.filter((k) => k !== sub.key)
                                    )
                                  }
                                  className="size-7 rounded-[8px] border-brand-border bg-brand-surface data-checked:border-brand-secondary data-checked:bg-brand-secondary data-checked:text-white [&_svg]:size-4"
                                />
                                {sub.displayName}
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </ProfileSectionCard>

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
              <p className="text-meta text-brand-ink-secondary">Page 2 of 2</p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={form.formState.isSubmitting}
                  className="h-9 rounded-[8px] bg-brand-ink px-6 text-small font-semibold text-brand-canvas hover:bg-brand-ink/90"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  className="h-9 rounded-[8px] bg-brand-secondary px-6 text-small font-semibold text-brand-canvas hover:bg-brand-secondary/90"
                >
                  {form.formState.isSubmitting
                    ? "Saving…"
                    : mode === "create"
                      ? "Post Job"
                      : "Save Changes"}
                </Button>
              </div>
              <span />
            </div>
          </>
        )}
      </form>
    </Form>
  );
}

function OptionCards<T extends string>({
  value,
  onChange,
  options,
  minHeightClass,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string; help: string }[];
  minHeightClass: string;
}) {
  return (
    <div role="radiogroup" className="grid gap-4 sm:grid-cols-2">
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex flex-col justify-center gap-1 rounded-[12px] border border-brand-border px-6 py-4 text-left transition-colors focus-visible:ring-2 focus-visible:ring-brand-secondary/50 focus-visible:outline-none",
              minHeightClass,
              selected
                ? "bg-brand-secondary text-brand-canvas"
                : "bg-brand-surface text-brand-ink hover:bg-brand-container/60"
            )}
          >
            <span className="text-subheading font-semibold tracking-[-0.96px]">
              {option.label}
            </span>
            <span className="text-small">{option.help}</span>
          </button>
        );
      })}
    </div>
  );
}
