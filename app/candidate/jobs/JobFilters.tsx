"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ProjectSkillsPicker } from "@/components/profile/ProjectSkillsPicker";
import type { SkillOption } from "@/components/profile/SkillCombobox";
import {
  LEVELS,
  LEVEL_LABELS,
  WORK_MODES,
  WORK_MODE_LABELS,
} from "@/lib/jobs";

function csv(value: string | null): string[] {
  return value ? value.split(",").filter(Boolean) : [];
}

// All filter state lives in the URL (shareable, back-button friendly). Each
// change pushes a new URL and the server re-renders the results.
export function JobFilters({ skills }: { skills: SkillOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const modes = csv(searchParams.get("mode"));
  const levels = csv(searchParams.get("level"));
  const skillIds = csv(searchParams.get("skill"));
  const hasFilters = modes.length + levels.length + skillIds.length > 0;

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
    const params = new URLSearchParams(searchParams.toString());
    params.delete("mode");
    params.delete("level");
    params.delete("skill");
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium">Work mode</legend>
        {WORK_MODES.map((m) => (
          <div key={m} className="flex items-center gap-2">
            <Checkbox
              id={`mode-${m}`}
              checked={modes.includes(m)}
              onCheckedChange={() => toggle("mode", modes, m)}
            />
            <Label htmlFor={`mode-${m}`} className="font-normal">
              {WORK_MODE_LABELS[m]}
            </Label>
          </div>
        ))}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium">Level</legend>
        {LEVELS.map((l) => (
          <div key={l} className="flex items-center gap-2">
            <Checkbox
              id={`level-${l}`}
              checked={levels.includes(l)}
              onCheckedChange={() => toggle("level", levels, l)}
            />
            <Label htmlFor={`level-${l}`} className="font-normal">
              {LEVEL_LABELS[l]}
            </Label>
          </div>
        ))}
      </fieldset>

      <div className="space-y-2">
        <p className="text-sm font-medium">Skills</p>
        <ProjectSkillsPicker
          skills={skills}
          value={skillIds}
          onChange={(ids) => update("skill", ids)}
        />
      </div>

      {hasFilters ? (
        <Button variant="ghost" size="sm" onClick={clearAll}>
          Clear filters
        </Button>
      ) : null}
    </div>
  );
}
