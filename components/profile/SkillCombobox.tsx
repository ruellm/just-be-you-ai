"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type SkillOption = { id: string; name: string };

// Searchable single-select over the Skill taxonomy. `disabledIds` hides skills
// already chosen elsewhere (e.g. skills you've added, or already on a project).
export function SkillCombobox({
  skills,
  value,
  onChange,
  disabledIds = [],
  placeholder = "Select a skill…",
  triggerClassName,
}: {
  skills: SkillOption[];
  value: string;
  onChange: (id: string) => void;
  disabledIds?: string[];
  placeholder?: string;
  triggerClassName?: string; // optional restyle hook for the trigger button
}) {
  const [open, setOpen] = useState(false);
  const selected = skills.find((s) => s.id === value);
  const available = skills.filter((s) => !disabledIds.includes(s.id));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", triggerClassName)}
        >
          {selected ? selected.name : placeholder}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search skills…" />
          <CommandList>
            <CommandEmpty>No skill found.</CommandEmpty>
            <CommandGroup>
              {available.map((skill) => (
                <CommandItem
                  key={skill.id}
                  value={skill.name}
                  onSelect={() => {
                    onChange(skill.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      value === skill.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {skill.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
