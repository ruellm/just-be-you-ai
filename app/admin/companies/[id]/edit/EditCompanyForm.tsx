"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { companyInitial } from "@/lib/jobs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MODAL_INPUT, Req } from "@/components/profile/FormModal";
import {
  BTN_PRIMARY,
  ProfileSectionCard,
} from "@/app/candidate/profile/ProfileSectionCard";
import { FIELD_LIMITS } from "@/app/business/company/schemas";

const LABEL = "text-small font-semibold text-brand-ink";
const INPUT = cn(MODAL_INPUT, "h-9 placeholder:text-brand-ink-secondary/60");

export type EditableCompany = {
  name: string;
  yearFounded: string;
  contactEmail: string;
  phone: string;
  headquarters: string;
  type: string;
  industry: string;
  website: string;
  logoUrl: string;
  description: string;
};

function Field({
  label,
  required,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className={LABEL}>
        {label}
        {required ? <Req /> : null}
      </label>
      {children}
    </div>
  );
}

export function EditCompanyForm({
  companyId,
  company,
}: {
  companyId: string;
  company: EditableCompany;
}) {
  const router = useRouter();
  const [dirty, setDirty] = useState(false);
  const [description, setDescription] = useState(company.description);
  const [logoUrl, setLogoUrl] = useState(company.logoUrl);

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      onChange={() => setDirty(true)}
      className="space-y-6 pb-24"
    >
      <ProfileSectionCard
        title="Basic Information"
        subtitle="Manage your company information so candidates know who they will be joining."
      >
        <div className="flex items-center gap-4 rounded-[12px] bg-brand-container px-5 py-4">
          <Avatar className="size-[60px] after:border-brand-border">
            {logoUrl ? <AvatarImage src={logoUrl} alt="" /> : null}
            <AvatarFallback className="bg-brand-surface text-subheading font-semibold text-brand-primary">
              {companyInitial(company.name || "?")}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-body font-semibold text-brand-ink">
              Company Profile Image
            </p>
            <p className="text-small text-brand-ink-secondary">
              Pulled from logo URL when available.
            </p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Company Name" required>
            <Input name="name" defaultValue={company.name} className={INPUT} maxLength={FIELD_LIMITS.name} />
          </Field>
          <Field label="Year Founded">
            <Input name="yearFounded" inputMode="numeric" defaultValue={company.yearFounded} className={INPUT} maxLength={FIELD_LIMITS.yearDigits} />
          </Field>
          <Field label="Contact Mail">
            <Input name="contactEmail" type="email" defaultValue={company.contactEmail} className={INPUT} maxLength={FIELD_LIMITS.contactEmail} />
          </Field>
          <Field label="Phone">
            <Input name="phone" defaultValue={company.phone} className={INPUT} maxLength={FIELD_LIMITS.phone} />
          </Field>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <Field label="Headquarters">
            <Input name="headquarters" defaultValue={company.headquarters} className={INPUT} maxLength={FIELD_LIMITS.headquarters} />
          </Field>
          <Field label="Type">
            <Input name="type" defaultValue={company.type} className={INPUT} maxLength={FIELD_LIMITS.type} />
          </Field>
          <Field label="Industry">
            <Input name="industry" defaultValue={company.industry} className={INPUT} maxLength={FIELD_LIMITS.industry} />
          </Field>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Company Website" required>
            <Input name="website" type="url" defaultValue={company.website} className={INPUT} maxLength={FIELD_LIMITS.url} />
          </Field>
          <Field label="Logo URL">
            <Input
              name="logoUrl"
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className={INPUT}
              maxLength={FIELD_LIMITS.url}
            />
          </Field>
        </div>
      </ProfileSectionCard>

      <ProfileSectionCard
        title="Company Description"
        subtitle="Tell us about yourself. A short introduction shown at the top of your profile."
      >
        <Textarea
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={FIELD_LIMITS.description}
          className="min-h-[110px] resize-y rounded-[8px] border-brand-border bg-brand-surface font-body text-small text-brand-ink shadow-none"
        />
        <p className="-mt-4 text-right text-small text-brand-ink-secondary">
          {description.length}/{FIELD_LIMITS.description} characters
        </p>
      </ProfileSectionCard>

      {dirty ? (
        <div className="fixed right-4 bottom-4 left-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-accent-4 bg-status-pending px-4 py-3 shadow-lg lg:right-14 lg:left-[calc(255px+3.5rem)]">
          <p className="text-small text-brand-ink">
            You have unsaved changes. Make sure you save them before navigating
            to other pages.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/admin/companies/${companyId}`)}
              className="h-9 rounded-[8px] border-brand-border bg-brand-surface px-4 text-small font-medium text-brand-ink hover:bg-brand-container"
            >
              Discard
            </Button>
            <Button type="submit" className={cn(BTN_PRIMARY, "h-9")}>
              Save Changes
            </Button>
          </div>
        </div>
      ) : null}
    </form>
  );
}
