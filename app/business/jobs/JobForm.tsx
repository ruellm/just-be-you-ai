"use client";

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
import { ProjectSkillsPicker } from "@/components/profile/ProjectSkillsPicker";
import type { SkillOption } from "@/components/profile/SkillCombobox";
import { LEVELS, LEVEL_LABELS, WORK_MODES, WORK_MODE_LABELS } from "@/lib/jobs";
import { jobSchema, type JobValues } from "./schemas";
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
};

export function JobForm({
  mode,
  jobId,
  defaultValues,
  skillOptions,
}: {
  mode: "create" | "edit";
  jobId?: string;
  defaultValues: JobValues;
  skillOptions: SkillOption[];
}) {
  const router = useRouter();
  const form = useForm<JobValues>({
    resolver: zodResolver(jobSchema),
    defaultValues,
  });

  async function onSubmit(values: JobValues) {
    const result =
      mode === "create"
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
      for (const [field, message] of Object.entries(result.fieldErrors)) {
        form.setError(field as keyof JobValues, { message });
      }
    }
    toast.error(result.error ?? "Could not save your changes.");
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-2xl space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Senior Frontend Developer" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea rows={4} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="roleOverview"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role overview</FormLabel>
              <FormControl>
                <Textarea rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="dayToDay"
          render={({ field }) => (
            <FormItem>
              <FormLabel>What does day-to-day look like</FormLabel>
              <FormControl>
                <Textarea rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="requirements"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Requirements</FormLabel>
              <FormControl>
                <Textarea rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="level"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Level</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {LEVELS.map((l) => (
                      <SelectItem key={l} value={l}>
                        {LEVEL_LABELS[l]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="workMode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Work mode</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {WORK_MODES.map((m) => (
                      <SelectItem key={m} value={m}>
                        {WORK_MODE_LABELS[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <Input placeholder="Makati, Metro Manila" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="salaryMin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Salary min (PHP / month)</FormLabel>
                <FormControl>
                  <Input inputMode="numeric" placeholder="50000" {...field} />
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
                <FormLabel>Salary max (PHP / month)</FormLabel>
                <FormControl>
                  <Input inputMode="numeric" placeholder="80000" {...field} />
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
              <FormLabel>Required skills</FormLabel>
              <ProjectSkillsPicker
                skills={skillOptions}
                value={field.value}
                onChange={field.onChange}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        {/* AI Interview Configuration (optional) */}
        <div className="space-y-4 border-t pt-6">
          <div>
            <h2 className="text-sm font-semibold">
              AI Interview Configuration (optional)
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              These fields guide the AI interviewer to produce better, more
              relevant questions. They&apos;re optional — the AI will still
              generate questions without them, but providing detail here
              significantly improves quality.
            </p>
          </div>
          <FormField
            control={form.control}
            name="interviewHints"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Interview hints</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    placeholder="What questions or topics should the AI cover? Provide examples or topics. e.g. 'Ask about state management in React. Probe for understanding of when to use Redux vs Context. A strong candidate explains tradeoffs.'"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="idealCandidateProfile"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ideal candidate profile</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    placeholder="Describe the kind of person you want — skills, traits, work ethic, values. e.g. 'Someone who explains tradeoffs, admits gaps, and asks clarifying questions.'"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="passingCriteria"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Passing criteria</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    placeholder="In your own words, what does a passing candidate look like? e.g. 'Can explain at least one past project in technical depth and demonstrates curiosity by asking thoughtful questions back.'"
                    {...field}
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
              <FormItem className="max-w-xs">
                <FormLabel>Maximum interview duration (minutes)</FormLabel>
                <FormControl>
                  <Input
                    inputMode="numeric"
                    min={5}
                    max={60}
                    placeholder="30"
                    {...field}
                  />
                </FormControl>
                <p className="text-muted-foreground text-sm">
                  Leave blank for default (30 minutes). Recommended: 15-20 for
                  most roles.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting
            ? "Saving…"
            : mode === "create"
              ? "Post job"
              : "Save changes"}
        </Button>
      </form>
    </Form>
  );
}
