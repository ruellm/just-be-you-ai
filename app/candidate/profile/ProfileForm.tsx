"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { LanguagesInput } from "@/components/profile/LanguagesInput";
import { cn } from "@/lib/utils";
import {
  FIELD_LIMITS,
  profileFormSchema,
  type BasicInfoValues,
  type ProfileFormValues,
  type SummaryValues,
} from "./schemas";
import { saveBasicInfo, saveSummary } from "./actions";
import { ProfileSectionCard } from "./ProfileSectionCard";

const INPUT_CLASS =
  "h-9 rounded-[8px] border-brand-border bg-brand-surface font-body text-sm text-brand-ink shadow-none placeholder:text-brand-ink-secondary";
const LABEL_CLASS = "font-body text-base font-semibold text-brand-ink";

function Req() {
  return (
    <span aria-hidden className="text-accent-2">
      *
    </span>
  );
}

const BASIC_KEYS: (keyof BasicInfoValues)[] = [
  "firstName",
  "middleName",
  "lastName",
  "suffix",
  "country",
  "city",
  "phone",
  "linkedinUrl",
  "expectedSalary",
  "nationality",
  "languages",
  "totalYearsExperience",
  "preferredRole",
];

// Basic Information + Profile Summary as ONE react-hook-form with dirty
// tracking. Save Changes calls the two existing server actions (saveBasicInfo
// + saveSummary) unchanged; Discard resets to the last-saved values.
export function ProfileForm({
  defaultValues,
  initials,
}: {
  defaultValues: ProfileFormValues;
  initials: string;
}) {
  const router = useRouter();
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues,
  });
  const { isDirty, isSubmitting } = form.formState;
  const summaryLength = form.watch("summary")?.length ?? 0;

  async function onSubmit(values: ProfileFormValues) {
    const basic = Object.fromEntries(
      BASIC_KEYS.map((k) => [k, values[k]])
    ) as BasicInfoValues;
    const summary: SummaryValues = { summary: values.summary };

    const [basicResult, summaryResult] = await Promise.all([
      saveBasicInfo(basic),
      saveSummary(summary),
    ]);

    let failed = false;
    for (const result of [basicResult, summaryResult]) {
      if (result.success) continue;
      failed = true;
      if (result.fieldErrors) {
        for (const [field, message] of Object.entries(result.fieldErrors)) {
          form.setError(field as keyof ProfileFormValues, { message });
        }
      }
      toast.error(result.error ?? "Could not save your changes.");
    }
    if (failed) {
      // Whatever did save is now the server state; refresh so the page's
      // other sections reflect it, but keep the form dirty for the retry.
      router.refresh();
      return;
    }

    toast.success("Profile updated");
    form.reset(values); // clean state = the just-saved values
    router.refresh();
  }

  function discard() {
    form.reset();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* ── Basic Information ─────────────────────────────────────── */}
        <ProfileSectionCard
          title="Basic Information"
          subtitle="These details will help employers know who they will be reviewing."
        >
          {/* LinkedIn avatar row — STATIC. There is no LinkedIn integration
              (auth is Google OAuth) and no avatar upload; this is a display
              block with an initials fallback only. */}
          <div className="flex items-center gap-4 rounded-[12px] bg-brand-container px-5 py-4">
            <Avatar className="size-[60px] after:border-brand-border">
              <AvatarFallback className="bg-brand-surface text-lg font-semibold text-brand-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-body text-base font-semibold text-brand-ink">
                LinkedIn Profile Image
              </p>
              <p className="font-body text-sm text-brand-ink-secondary">
                Pulled from LinkedIn when available.
              </p>
            </div>
          </div>

          {/* Row 1 */}
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <TextField
              form={form}
              name="firstName"
              label="First Name"
              required
              placeholder="Juan"
              maxLength={FIELD_LIMITS.name}
            />
            <TextField
              form={form}
              name="middleName"
              label="Middle Name"
              placeholder="Santos"
              maxLength={FIELD_LIMITS.middleName}
            />
            <TextField
              form={form}
              name="lastName"
              label="Last Name"
              required
              placeholder="Dela Cruz"
              maxLength={FIELD_LIMITS.name}
            />
            <TextField
              form={form}
              name="suffix"
              label="Suffix"
              placeholder="Jr."
              maxLength={FIELD_LIMITS.suffix}
            />
          </div>

          {/* Row 2 */}
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <TextField
              form={form}
              name="country"
              label="Country of Residence"
              required
              placeholder="Philippines"
              maxLength={FIELD_LIMITS.location}
            />
            <TextField
              form={form}
              name="city"
              label="City"
              required
              placeholder="Manila"
              maxLength={FIELD_LIMITS.location}
            />
            <TextField
              form={form}
              name="nationality"
              label="Nationality"
              required
              placeholder="Filipino"
              maxLength={FIELD_LIMITS.location}
            />
            <TextField
              form={form}
              name="phone"
              label="Phone"
              placeholder="+63 ..."
              maxLength={FIELD_LIMITS.phone}
            />
          </div>

          {/* Row 3 */}
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            <TextField
              form={form}
              name="linkedinUrl"
              label="LinkedIn URL"
              placeholder="https://linkedin.com/in/you"
              maxLength={FIELD_LIMITS.url}
            />
            <TextField
              form={form}
              name="expectedSalary"
              label="Expected Salary (PHP / month)"
              placeholder="50000"
              inputMode="numeric"
              maxLength={FIELD_LIMITS.salaryDigits}
            />
            <TextField
              form={form}
              name="totalYearsExperience"
              label="Total Years of Experience"
              placeholder="5"
              inputMode="numeric"
              maxLength={FIELD_LIMITS.yearsDigits}
            />
          </div>

          {/* Row 4 */}
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              form={form}
              name="preferredRole"
              label="Preferred Role"
              placeholder="Frontend Engineer"
              maxLength={FIELD_LIMITS.preferredRole}
            />
            <FormField
              control={form.control}
              name="languages"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="languages-input" className={LABEL_CLASS}>
                    Languages Spoken (Max of {FIELD_LIMITS.maxLanguages})
                  </FormLabel>
                  <LanguagesInput
                    id="languages-input"
                    value={field.value}
                    onChange={field.onChange}
                    maxLength={FIELD_LIMITS.language}
                    max={FIELD_LIMITS.maxLanguages}
                    className={INPUT_CLASS}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </ProfileSectionCard>

        {/* ── Profile Summary ───────────────────────────────────────── */}
        <ProfileSectionCard
          title="Profile Summary"
          subtitle="Tell us about yourself. A short introduction shown at the top of your profile."
        >
          <FormField
            control={form.control}
            name="summary"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    maxLength={FIELD_LIMITS.summary}
                    className="min-h-[110px] resize-y rounded-[8px] border-brand-border bg-brand-surface font-body text-sm text-brand-ink shadow-none"
                    {...field}
                  />
                </FormControl>
                <div className="flex items-start justify-between gap-4">
                  <FormMessage />
                  <p
                    className={cn(
                      "ml-auto font-body text-sm",
                      summaryLength > FIELD_LIMITS.summary
                        ? "text-accent-2"
                        : "text-brand-ink-secondary"
                    )}
                  >
                    {summaryLength}/{FIELD_LIMITS.summary} characters
                  </p>
                </div>
              </FormItem>
            )}
          />
        </ProfileSectionCard>

        {/* ── Sticky unsaved-changes bar ────────────────────────────── */}
        {isDirty ? (
          <div
            role="status"
            className="fixed inset-x-4 bottom-4 z-30 flex flex-col gap-3 rounded-[12px] border-2 border-accent-4 bg-status-pending px-5 py-3 font-body shadow-lg sm:flex-row sm:items-center sm:justify-between lg:left-[calc(255px+2rem)] lg:right-8"
          >
            <p className="text-sm text-brand-ink">
              You have unsaved changes. Make sure you save them before
              navigating to other pages.
            </p>
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={discard}
                disabled={isSubmitting}
                className="h-9 rounded-[8px] border-brand-border bg-brand-surface text-sm font-medium text-brand-ink hover:bg-brand-container"
              >
                Discard
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-9 rounded-[8px] bg-brand-secondary text-sm font-medium text-white hover:bg-brand-secondary/90"
              >
                {isSubmitting ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </div>
        ) : null}
      </form>
    </Form>
  );
}

function TextField({
  form,
  name,
  label,
  required,
  placeholder,
  maxLength,
  inputMode,
}: {
  form: ReturnType<typeof useForm<ProfileFormValues>>;
  name: Exclude<keyof ProfileFormValues, "languages">;
  label: string;
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
  inputMode?: "numeric";
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className={LABEL_CLASS}>
            {label} {required ? <Req /> : null}
          </FormLabel>
          <FormControl>
            <Input
              placeholder={placeholder}
              maxLength={maxLength}
              inputMode={inputMode}
              className={INPUT_CLASS}
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
