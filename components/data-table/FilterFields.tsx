"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// URL-param-driven filter fields shared by the business dashboard + jobs
// tables (white, brand border, 40px, 12px radius). Each field owns ONE search
// param; any change resets `page`. The server does the filtering.

// ONE shared shape for all three field types (search / date / select) so their
// height, radius, border and font size can't drift apart again. Class strings
// are written out literally — Tailwind scans source text, so an interpolated
// class name would never be generated.
// `md:text-small` neutralises the `md:text-sm` that Input/Textarea carry in
// their base classes — without it the two text fields would flip to a flat 14px
// at >=768px while the select stayed on the fluid scale.
const FIELD_CLASS =
  "h-10 rounded-[12px] border-brand-border bg-brand-surface font-body text-small md:text-small font-normal text-brand-ink shadow-none";

// shadcn's SelectTrigger sets its own height via `data-[size=default]:h-8`,
// whose attribute selector out-specifies a plain `h-10`, so the trigger
// rendered 32px next to the 40px inputs. Repeating the height at the SAME
// specificity lets tailwind-merge drop the h-8 outright.
const SELECT_TRIGGER_CLASS = cn(FIELD_CLASS, "data-[size=default]:h-10");

// "Clear" item value — Radix Select shows the placeholder for value "" (no
// filter) but a SelectItem itself can't have an empty value.
const ANY = "__any";

function useParamSetter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return function set(name: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== ANY) params.set(name, value);
    else params.delete(name);
    params.delete("page");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };
}

// Debounced (350ms) text search bound to `param`.
export function SearchField({
  param = "q",
  placeholder,
  className,
}: {
  param?: string;
  placeholder: string;
  className?: string;
}) {
  const searchParams = useSearchParams();
  const set = useParamSetter();
  const current = searchParams.get(param) ?? "";
  const [value, setValue] = useState(current);

  // Keep the box in sync if the param changes elsewhere (e.g. back button).
  useEffect(() => {
    setValue(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  useEffect(() => {
    if (value.trim() === current) return; // no change → don't push (incl. mount)
    const timer = setTimeout(() => set(param, value.trim()), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className={cn("relative w-full sm:w-[293px]", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-brand-ink-secondary" />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(FIELD_CLASS, "pl-9 placeholder:text-brand-ink-secondary")}
      />
    </div>
  );
}

// Native date input (no date-picker primitive is installed) bound to `param`
// as YYYY-MM-DD.
export function DateField({
  param = "date",
  label = "Select date",
  className,
}: {
  param?: string;
  label?: string;
  className?: string;
}) {
  const searchParams = useSearchParams();
  const set = useParamSetter();
  const value = searchParams.get(param) ?? "";
  return (
    <div className={cn("relative w-full sm:w-[162px]", className)}>
      <CalendarDays className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-brand-ink-secondary" />
      <Input
        type="date"
        value={value}
        onChange={(e) => set(param, e.target.value)}
        aria-label={label}
        className={cn(
          FIELD_CLASS,
          "pl-9 text-brand-ink-secondary [&::-webkit-calendar-picker-indicator]:opacity-0",
          value && "text-brand-ink"
        )}
      />
    </div>
  );
}

// Single-select dropdown bound to `param`; the first item clears the filter.
export function SelectField({
  param,
  placeholder,
  clearLabel,
  options,
  className,
}: {
  param: string;
  placeholder: string;
  clearLabel: string;
  options: { value: string; label: string }[];
  className?: string;
}) {
  const searchParams = useSearchParams();
  const set = useParamSetter();
  return (
    <Select
      value={searchParams.get(param) ?? ""}
      onValueChange={(v) => set(param, v)}
    >
      <SelectTrigger
        aria-label={placeholder}
        className={cn(
          SELECT_TRIGGER_CLASS,
          "w-full sm:w-[154px] data-[placeholder]:text-brand-ink-secondary [&_svg]:text-brand-ink-secondary",
          className
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="rounded-[12px] border-brand-border font-body">
        <SelectItem value={ANY}>{clearLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
