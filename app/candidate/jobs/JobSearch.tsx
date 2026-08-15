"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Debounced text filter bound to one URL search param (`q` for title/
// description search, `location` for the province/city filter). Writes the
// trimmed value to the URL after 350ms; the server does the filtering.
export function JobSearch({
  param = "q",
  placeholder,
  id,
  className,
}: {
  param?: "q" | "location";
  placeholder: string;
  id?: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get(param) ?? "");

  // Keep the box in sync when the param is cleared elsewhere (Clear filters).
  const current = searchParams.get(param) ?? "";
  useEffect(() => {
    setValue(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  useEffect(() => {
    if (value.trim() === current) return; // no change → don't push (incl. mount)

    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value.trim()) params.set(param, value.trim());
      else params.delete(param);
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <Input
      id={id}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder={placeholder}
      className={cn(
        "h-10 rounded-[12px] border-brand-border bg-brand-surface font-body text-sm text-brand-ink shadow-none placeholder:text-brand-ink-secondary",
        className
      )}
    />
  );
}
