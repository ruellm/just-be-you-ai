"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Pencil } from "lucide-react";
import {
  BTN_PRIMARY,
  ProfileSectionCard,
} from "@/app/candidate/profile/ProfileSectionCard";
import { ProfileImageModal } from "@/components/profile/ProfileImageModal";
import { cn } from "@/lib/utils";
import { companySchema, FIELD_LIMITS, type CompanyValues } from "./schemas";
import { saveCompany } from "./actions";

const INPUT_CLASS =
  "h-9 rounded-[8px] border-brand-border bg-brand-surface font-body text-small text-brand-ink shadow-none";
const LABEL_CLASS = "font-body text-body font-semibold text-brand-ink";

function Req() {
  return (
    <span aria-hidden className="text-accent-2">
      *
    </span>
  );
}

// Basic Information + Company Description as ONE react-hook-form with dirty
// tracking (same pattern as the candidate ProfileForm). Save Changes calls
// the existing saveCompany action; Discard resets to the last-saved values.
export function CompanyForm({
  defaultValues,
  initials,
}: {
  defaultValues: CompanyValues;
  initials: string;
}) {
  const router = useRouter();
  const form = useForm<CompanyValues>({
    resolver: zodResolver(companySchema),
    defaultValues,
  });
  const { isDirty, isSubmitting } = form.formState;
  const descriptionLength = form.watch("description")?.length ?? 0;
  const logoUrl = form.watch("logoUrl");

  async function onSubmit(values: CompanyValues) {
    const result = await saveCompany(values);
    if (result.success) {
      toast.success("Company profile saved");
      form.reset(values); // clean state = the just-saved values
      router.refresh(); // sidebar name/logo read from the DB
      return;
    }
    if (result.fieldErrors) {
      for (const [field, message] of Object.entries(result.fieldErrors)) {
        form.setError(field as keyof CompanyValues, { message });
      }
    }
    toast.error(result.error ?? "Could not save your changes.");
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
          subtitle="Manage your company information so candidates know who they will be joining."
        >
          {/* Logo row — STATIC display (no upload). logoUrl is an arbitrary
              external URL, so it goes through Radix AvatarImage (initials
              fallback on failure) — same approach as BusinessSidebar. */}
          <div className="flex flex-wrap items-center gap-4 rounded-[12px] border border-brand-border bg-brand-container px-5 py-4">
            <Avatar className="size-[60px] after:border-brand-border">
              {logoUrl ? <AvatarImage src={logoUrl} alt="" /> : null}
              <AvatarFallback className="bg-brand-surface text-subheading font-semibold text-brand-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-body text-body font-semibold text-brand-ink">
                Company Profile Image
              </p>
              <p className="font-body text-small text-brand-ink-secondary">
                Add a link to your company logo.
              </p>
            </div>
            {/* Sole path for logoUrl now — the plain "Logo URL" text field was
                removed so there's one way to set it. The value still lives in
                this form, so the sticky save bar persists it as before. */}
            <ProfileImageModal
              value={logoUrl}
              label="Company Logo URL"
              onSubmit={(url) =>
                form.setValue("logoUrl", url, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              trigger={
                <Button type="button" className={cn(BTN_PRIMARY, "ml-auto")}>
                  <Pencil /> Edit Image
                </Button>
              }
            />
          </div>

          {/* Row 1 */}
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              form={form}
              name="name"
              label="Company Name"
              required
              placeholder="Acme Inc."
              maxLength={FIELD_LIMITS.name}
            />
            <TextField
              form={form}
              name="yearFounded"
              label="Year Founded"
              placeholder="2015"
              maxLength={FIELD_LIMITS.yearDigits}
              inputMode="numeric"
            />
          </div>

          {/* Row 2 */}
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              form={form}
              name="contactEmail"
              label="Contact Mail"
              placeholder="hello@acme.com"
              maxLength={FIELD_LIMITS.contactEmail}
              type="email"
            />
            <TextField
              form={form}
              name="phone"
              label="Phone"
              placeholder="+63 2 8123 4567"
              maxLength={FIELD_LIMITS.phone}
              type="tel"
            />
          </div>

          {/* Row 3 */}
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            <TextField
              form={form}
              name="headquarters"
              label="Headquarters"
              placeholder="Makati, Metro Manila"
              maxLength={FIELD_LIMITS.headquarters}
            />
            <TextField
              form={form}
              name="type"
              label="Type"
              placeholder="Privately Held"
              maxLength={FIELD_LIMITS.type}
            />
            <TextField
              form={form}
              name="industry"
              label="Industry"
              placeholder="Software Development"
              maxLength={FIELD_LIMITS.industry}
            />
          </div>

          {/* Row 4 — logoUrl is set through the profile-image modal above, so
              it no longer has a text field here. */}
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              form={form}
              name="website"
              label="Company Website"
              required
              placeholder="https://example.com"
              maxLength={FIELD_LIMITS.url}
            />
          </div>
        </ProfileSectionCard>

        {/* ── Company Description ───────────────────────────────────── */}
        <ProfileSectionCard
          title="Company Description"
          subtitle="Tell us about yourself. A short introduction shown at the top of your profile."
        >
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  {/* Existing descriptions longer than the cap still LOAD
                      (maxLength only blocks further typing); saving is
                      blocked by the Zod cap until trimmed. */}
                  <Textarea
                    maxLength={FIELD_LIMITS.description}
                    className="min-h-[111px] resize-y rounded-[8px] border-brand-border bg-brand-surface font-body text-small text-brand-ink shadow-none"
                    {...field}
                  />
                </FormControl>
                <div className="flex items-start justify-between gap-4">
                  <FormMessage />
                  <p
                    className={cn(
                      "ml-auto font-body text-small",
                      descriptionLength > FIELD_LIMITS.description
                        ? "text-accent-2"
                        : "text-brand-ink-secondary"
                    )}
                  >
                    {descriptionLength}/{FIELD_LIMITS.description} characters
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
            <p className="text-small text-brand-ink">
              You have unsaved changes. Make sure you save them before
              navigating to other pages.
            </p>
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={discard}
                disabled={isSubmitting}
                className="h-9 rounded-[8px] border-brand-border bg-brand-surface text-small font-medium text-brand-ink hover:bg-brand-container"
              >
                Discard
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-9 rounded-[8px] bg-brand-secondary text-small font-medium text-white hover:bg-brand-secondary/90"
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
  type,
}: {
  form: ReturnType<typeof useForm<CompanyValues>>;
  name: keyof CompanyValues;
  label: string;
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
  inputMode?: "numeric";
  type?: "email" | "tel";
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
              type={type}
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
