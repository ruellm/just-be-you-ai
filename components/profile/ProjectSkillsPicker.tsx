"use client";

import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  SkillCombobox,
  type SkillOption,
} from "@/components/profile/SkillCombobox";

// Multi-select over the Skill taxonomy: pick a skill from the combobox to add
// it as a chip; click × to remove. Value is the list of selected skill ids.
export function ProjectSkillsPicker({
  skills,
  value,
  onChange,
  placeholder = "Add a skill used…",
  triggerClassName,
}: {
  skills: SkillOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  triggerClassName?: string; // passed through to the combobox trigger
}) {
  const byId = new Map(skills.map((s) => [s.id, s.name]));

  function add(id: string) {
    if (id && !value.includes(id)) onChange([...value, id]);
  }
  function remove(id: string) {
    onChange(value.filter((v) => v !== id));
  }

  return (
    <div className="space-y-2">
      <SkillCombobox
        skills={skills}
        value=""
        onChange={add}
        disabledIds={value}
        placeholder={placeholder}
        triggerClassName={triggerClassName}
      />
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((id) => (
            <Badge key={id} variant="secondary" className="gap-1">
              {byId.get(id) ?? "Unknown"}
              <button
                type="button"
                onClick={() => remove(id)}
                aria-label="Remove skill"
                className="hover:text-foreground/70 -mr-0.5 ml-0.5"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
