"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ProjectSkillsPicker } from "@/components/profile/ProjectSkillsPicker";
import type { SkillOption } from "@/components/profile/SkillCombobox";
import {
  LEVELS,
  LEVEL_LABELS,
  WORK_MODES,
  WORK_MODE_LABELS,
} from "@/lib/jobs";
import { cn } from "@/lib/utils";
import { JobSearch } from "./JobSearch";

function csv(value: string | null): string[] {
  return value ? value.split(",").filter(Boolean) : [];
}

// Shared look for every field in the bar (white, brand border, 40px, 12px radius).
const FIELD_CLASS =
  "h-10 w-full rounded-[12px] border border-brand-border bg-brand-surface px-3 font-body text-small font-normal text-brand-ink shadow-none";

// Horizontal two-row filter bar. All filter state lives in the URL
// (shareable, back-button friendly): `q`, `location`, `mode`, `level`,
// `skill` (CSV) + `page`. Each change pushes a new URL and the server
// re-renders the results. Work Mode / Level stay MULTI-select — the dropdown
// trigger just wraps the same checkbox lists in a popover.
export function JobFilters({ skills }: { skills: SkillOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const modes = csv(searchParams.get("mode"));
  const levels = csv(searchParams.get("level"));
  const skillIds = csv(searchParams.get("skill"));
  const hasFilters =
    modes.length + levels.length + skillIds.length > 0 ||
    !!searchParams.get("q") ||
    !!searchParams.get("location");

  function update(name: string, values: string[]) {
    const params = new URLSearchParams(searchParams.toString());
    if (values.length) params.set(name, values.join(","));
    else params.delete(name);
    params.delete("page"); // reset pagination when filters change
    router.push(`${pathname}?${params.toString()}`);
  }

  function toggle(name: string, list: string[], value: string) {
    update(
      name,
      list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
    );
  }

  function clearAll() {
    router.push(pathname);
  }

  return (
    <div className="space-y-4 font-body">
      {/* Row 1: search + location */}
      <div className="grid gap-4 md:grid-cols-[55fr_45fr]">
        <Field label="Search jobs" htmlFor="filter-q">
          <JobSearch
            id="filter-q"
            param="q"
            placeholder="Search by title or description"
          />
        </Field>
        <Field label="Location" htmlFor="filter-location">
          <JobSearch
            id="filter-location"
            param="location"
            placeholder="Search by province or city"
          />
        </Field>
      </div>

      {/* Row 2: work mode + level + skills (+ clear) */}
      <div className="grid gap-4 md:grid-cols-[20fr_20fr_60fr]">
        <Field label="Work Mode">
          <MultiSelect
            placeholder="Select mode"
            options={WORK_MODES.map((m) => ({
              value: m,
              label: WORK_MODE_LABELS[m],
            }))}
            selected={modes}
            onToggle={(v) => toggle("mode", modes, v)}
          />
        </Field>
        <Field label="Level">
          <MultiSelect
            placeholder="Select level"
            options={LEVELS.map((l) => ({ value: l, label: LEVEL_LABELS[l] }))}
            selected={levels}
            onToggle={(v) => toggle("level", levels, v)}
          />
        </Field>
        <Field label="Relevant Skills">
          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1">
              <ProjectSkillsPicker
                skills={skills}
                value={skillIds}
                onChange={(ids) => update("skill", ids)}
                placeholder="Add a skill used.."
                triggerClassName={cn(
                  FIELD_CLASS,
                  "hover:bg-brand-surface data-[state=open]:bg-brand-surface"
                )}
              />
            </div>
            {hasFilters ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="h-10 shrink-0 font-body text-small text-brand-ink-secondary hover:text-brand-primary"
              >
                Clear filters
              </Button>
            ) : null}
          </div>
        </Field>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label
        htmlFor={htmlFor}
        className="text-body font-semibold text-brand-ink"
      >
        {label}
      </Label>
      {children}
    </div>
  );
}

// Dropdown-looking trigger over a checkbox list — keeps multi-select intact
// while matching the design's single "select" field.
function MultiSelect({
  placeholder,
  options,
  selected,
  onToggle,
}: {
  placeholder: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const summary =
    selected.length === 0
      ? null
      : selected.length === 1
        ? (options.find((o) => o.value === selected[0])?.label ?? "1 selected")
        : `${selected.length} selected`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            FIELD_CLASS,
            "flex items-center justify-between gap-2 text-left transition-colors hover:bg-brand-container/60",
            summary ? "text-brand-ink" : "text-brand-ink-secondary"
          )}
        >
          <span className="truncate">{summary ?? placeholder}</span>
          <ChevronDown className="size-4 shrink-0 text-brand-ink-secondary" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[--radix-popover-trigger-width] min-w-44 space-y-2 rounded-[12px] border-brand-border p-3 font-body"
      >
        {options.map((o) => (
          <div key={o.value} className="flex items-center gap-2">
            <Checkbox
              id={`${placeholder}-${o.value}`}
              checked={selected.includes(o.value)}
              onCheckedChange={() => onToggle(o.value)}
            />
            <Label
              htmlFor={`${placeholder}-${o.value}`}
              className="text-small font-normal text-brand-ink"
            >
              {o.label}
            </Label>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}
