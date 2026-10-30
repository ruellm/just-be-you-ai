"use client";

import { useId, type ReactNode } from "react";
import { useFormContext } from "react-hook-form";
import { CheckCircle2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  NARRATIVE_FIELD_LABELS,
  NARRATIVE_FIELD_LIMITS,
  type JobHints,
  type NarrativeField,
  type SkillRef,
} from "./ai-schemas";
import type { JobValues } from "./schemas";

// The AI Hints side panel. Hint state lives in the parent (so the header
// badge can count what is still pending); every accept/decline/undo writes
// through react-hook-form so validation and the character counters follow.

type HintStatus = "pending" | "accepted" | "declined";

export type HintItem =
  | { id: string; kind: "missingSkill"; skill: SkillRef; status: HintStatus }
  | {
      id: string;
      kind: "missingInfo";
      field: NarrativeField;
      draft: string;
      previous: string;
      status: HintStatus;
    }
  | {
      id: string;
      kind: "qualifier";
      text: string;
      previous: string;
      note: string | null;
      status: HintStatus;
    }
  | {
      id: string;
      kind: "unmentionedSkill";
      skill: SkillRef;
      status: HintStatus;
    };

export function hintItemsFrom(hints: JobHints): HintItem[] {
  const items: HintItem[] = [];
  hints.missingSkills.forEach((skill) =>
    items.push({
      id: `ms-${skill.id}`,
      kind: "missingSkill",
      skill,
      status: "pending",
    })
  );
  hints.missingInfo.forEach((m) =>
    items.push({
      id: `mi-${m.field}`,
      kind: "missingInfo",
      field: m.field,
      draft: m.draft,
      previous: "",
      status: "pending",
    })
  );
  hints.qualifiers.forEach((q, index) =>
    items.push({
      id: `q-${index}`,
      kind: "qualifier",
      text: q.text,
      previous: "",
      note: null,
      status: "pending",
    })
  );
  hints.unmentionedSkills.forEach((skill) =>
    items.push({
      id: `us-${skill.id}`,
      kind: "unmentionedSkill",
      skill,
      status: "pending",
    })
  );
  return items;
}

export function pendingHintCount(items: HintItem[]): number {
  return items.filter((i) => i.status === "pending").length;
}

const GROUP_TITLE =
  "text-meta font-bold uppercase tracking-[0.5px] text-brand-secondary";
const GROUP_TEXT = "text-meta leading-4 text-brand-ink";
const SMALL_PRIMARY =
  "h-7 rounded-[8px] bg-brand-secondary px-3 font-body text-meta font-semibold text-white hover:bg-brand-secondary/90";
const SMALL_OUTLINE =
  "h-7 rounded-[8px] border-brand-border bg-brand-surface px-3 font-body text-meta font-semibold text-brand-ink-secondary shadow-none hover:bg-brand-container";

export function AiHintsPanel({
  items,
  onChange,
  onClose,
  className,
}: {
  items: HintItem[];
  onChange: (items: HintItem[]) => void;
  onClose: () => void;
  className?: string;
}) {
  const form = useFormContext<JobValues>();
  const headingId = useId();
  const pending = pendingHintCount(items);

  const setOpts = { shouldDirty: true, shouldValidate: true } as const;

  function update(id: string, patch: Partial<HintItem>) {
    onChange(
      items.map((i) => (i.id === id ? ({ ...i, ...patch } as HintItem) : i))
    );
  }

  function addSkill(id: string) {
    const ids = form.getValues("skillIds");
    if (!ids.includes(id)) form.setValue("skillIds", [...ids, id], setOpts);
  }
  function removeSkill(id: string) {
    const ids = form.getValues("skillIds");
    form.setValue(
      "skillIds",
      ids.filter((s) => s !== id),
      setOpts
    );
  }

  function acceptMissingInfo(item: Extract<HintItem, { kind: "missingInfo" }>) {
    const previous = form.getValues(item.field);
    form.setValue(item.field, item.draft, setOpts);
    update(item.id, { status: "accepted", previous });
  }

  function acceptQualifier(item: Extract<HintItem, { kind: "qualifier" }>) {
    const current = form.getValues("requirements");
    const next = current.trim()
      ? `${current.trimEnd()}\n${item.text}`
      : item.text;
    if (next.length > NARRATIVE_FIELD_LIMITS.requirements) {
      update(item.id, {
        note: "Requirements is at its character limit, so this was not added. Trim it first.",
      });
      return;
    }
    form.setValue("requirements", next, setOpts);
    update(item.id, { status: "accepted", previous: current, note: null });
  }

  const missingSkills = items.filter(
    (i): i is Extract<HintItem, { kind: "missingSkill" }> =>
      i.kind === "missingSkill" && i.status !== "declined"
  );
  const missingInfo = items.filter(
    (i): i is Extract<HintItem, { kind: "missingInfo" }> =>
      i.kind === "missingInfo" && i.status !== "declined"
  );
  const qualifiers = items.filter(
    (i): i is Extract<HintItem, { kind: "qualifier" }> =>
      i.kind === "qualifier" && i.status !== "declined"
  );
  const unmentioned = items.filter(
    (i): i is Extract<HintItem, { kind: "unmentionedSkill" }> =>
      i.kind === "unmentionedSkill" && i.status !== "declined"
  );
  const nothingLeft =
    !missingSkills.length &&
    !missingInfo.length &&
    !qualifiers.length &&
    !unmentioned.length;

  return (
    <aside
      aria-labelledby={headingId}
      className={cn(
        "space-y-4 rounded-[12px] border border-brand-border bg-brand-surface p-4 font-body",
        className
      )}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 shrink-0 text-brand-secondary" />
          <h2
            id={headingId}
            className="flex-1 text-subheading font-semibold tracking-[-0.5px] text-brand-primary"
          >
            AI Hints
          </h2>
          <HintCountBadge count={pending} />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Close AI Hints"
            onClick={onClose}
            className="text-brand-ink-secondary hover:bg-brand-container hover:text-brand-ink"
          >
            <X />
          </Button>
        </div>
        <p className="text-meta text-brand-ink-secondary">
          Ways to make this job post clearer and easier to match. Feel free to
          accept or decline.
        </p>
      </div>

      {nothingLeft ? (
        <p className="rounded-[8px] border border-brand-border p-3 text-meta text-brand-ink-secondary">
          Nothing left to review. Your job post looks complete.
        </p>
      ) : null}

      {missingSkills.length ? (
        <HintGroup
          title="Missing skills"
          description="Your requirements mention these, but they aren't in Required Skills. Decide on each one."
        >
          {missingSkills.map((item) =>
            item.status === "accepted" ? (
              <DoneRow
                key={item.id}
                text={`${item.skill.name} added to skills`}
                onUndo={() => {
                  removeSkill(item.skill.id);
                  update(item.id, { status: "pending" });
                }}
              />
            ) : (
              <SkillRow
                key={item.id}
                name={item.skill.name}
                primaryLabel="Add"
                onPrimary={() => {
                  addSkill(item.skill.id);
                  update(item.id, { status: "accepted" });
                }}
                onDecline={() => update(item.id, { status: "declined" })}
              />
            )
          )}
        </HintGroup>
      ) : null}

      {missingInfo.length ? (
        <HintGroup title="Missing info">
          {missingInfo.map((item) =>
            item.status === "accepted" ? (
              <DoneRow
                key={item.id}
                text={`"${NARRATIVE_FIELD_LABELS[item.field]}" drafted`}
                onUndo={() => {
                  form.setValue(item.field, item.previous, setOpts);
                  update(item.id, { status: "pending" });
                }}
              />
            ) : (
              <WideRow
                key={item.id}
                text={`We will draft "${NARRATIVE_FIELD_LABELS[item.field]}" section for you.`}
                onAccept={() => acceptMissingInfo(item)}
                onDecline={() => update(item.id, { status: "declined" })}
              />
            )
          )}
        </HintGroup>
      ) : null}

      {qualifiers.length ? (
        <HintGroup title="Qualifier">
          {qualifiers.map((item) =>
            item.status === "accepted" ? (
              <DoneRow
                key={item.id}
                text={`"${item.text}" added to requirements`}
                onUndo={() => {
                  form.setValue("requirements", item.previous, setOpts);
                  update(item.id, { status: "pending" });
                }}
              />
            ) : (
              <WideRow
                key={item.id}
                text={`We will add "${item.text}" as a required qualifier in the requirements section.`}
                note={item.note}
                onAccept={() => acceptQualifier(item)}
                onDecline={() => update(item.id, { status: "declined" })}
              />
            )
          )}
        </HintGroup>
      ) : null}

      {unmentioned.length ? (
        <HintGroup
          title="Check required skills"
          description="These skills aren't mentioned in the description. Keep each as required?"
        >
          {unmentioned.map((item) =>
            item.status === "accepted" ? (
              <DoneRow
                key={item.id}
                text={`${item.skill.name} removed from skills`}
                onUndo={() => {
                  addSkill(item.skill.id);
                  update(item.id, { status: "pending" });
                }}
              />
            ) : (
              <SkillRow
                key={item.id}
                name={item.skill.name}
                primaryLabel="Keep"
                onPrimary={() => update(item.id, { status: "declined" })}
                onDecline={() => {
                  removeSkill(item.skill.id);
                  update(item.id, { status: "accepted" });
                }}
              />
            )
          )}
        </HintGroup>
      ) : null}
    </aside>
  );
}

export function HintCountBadge({ count }: { count: number }) {
  return (
    <span
      aria-label={`${count} pending`}
      className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-secondary text-[11px] font-semibold text-white"
    >
      {count}
    </span>
  );
}

function HintGroup({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2 rounded-[8px] border border-brand-border p-3">
      <h3 className={GROUP_TITLE}>{title}</h3>
      {description ? <p className={GROUP_TEXT}>{description}</p> : null}
      <div className="divide-y divide-brand-border">{children}</div>
    </section>
  );
}

function SkillRow({
  name,
  primaryLabel,
  onPrimary,
  onDecline,
}: {
  name: string;
  primaryLabel: string;
  onPrimary: () => void;
  onDecline: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-2">
      <span className={GROUP_TEXT}>{name}</span>
      <div className="flex shrink-0 gap-1.5">
        <Button type="button" onClick={onPrimary} className={SMALL_PRIMARY}>
          {primaryLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onDecline}
          className={SMALL_OUTLINE}
        >
          Decline
        </Button>
      </div>
    </div>
  );
}

function WideRow({
  text,
  note,
  onAccept,
  onDecline,
}: {
  text: string;
  note?: string | null;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div className="space-y-2 py-2">
      <p className={GROUP_TEXT}>{text}</p>
      {note ? <p className="text-meta text-accent-2">{note}</p> : null}
      <div className="grid grid-cols-2 gap-1.5">
        <Button
          type="button"
          onClick={onAccept}
          className={cn(SMALL_PRIMARY, "w-full")}
        >
          Accept
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onDecline}
          className={cn(SMALL_OUTLINE, "w-full")}
        >
          Decline
        </Button>
      </div>
    </div>
  );
}

function DoneRow({ text, onUndo }: { text: string; onUndo: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 py-2">
      <span className="flex min-w-0 items-center gap-1.5 text-meta text-brand-ink-secondary">
        <CheckCircle2 className="size-4 shrink-0 text-accent-3" />
        <span className="truncate">{text}</span>
      </span>
      <button
        type="button"
        onClick={onUndo}
        className="shrink-0 text-meta font-semibold text-brand-secondary hover:underline"
      >
        Undo
      </button>
    </div>
  );
}
