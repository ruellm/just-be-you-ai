"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/EmptyState";
import { Dialog } from "@/components/ui/dialog";
import {
  FormModalBody,
  FormModalContent,
  FormModalFooter,
  MODAL_INPUT,
  MODAL_LABEL,
  Req,
} from "@/components/profile/FormModal";
import {
  SkillCombobox,
  type SkillOption,
} from "@/components/profile/SkillCombobox";
import { FIELD_LIMITS } from "../schemas";
import { cn } from "@/lib/utils";
import {
  BTN_PRIMARY,
  INSET_PANEL,
  ProfileSectionHeader,
} from "../ProfileSectionCard";
import { addSkill, deleteCandidateSkill, updateSkillYears } from "./actions";

export type CandidateSkillDTO = {
  id: string;
  skillId: string;
  skillName: string;
  years: number;
};

// `title`/`subtitle`: when given, the section renders its own header row so
// the "Add Skill" button can sit top-right of the card.
export function SkillsSection({
  candidateSkills,
  skillOptions,
  title,
  subtitle,
}: {
  candidateSkills: CandidateSkillDTO[];
  skillOptions: SkillOption[];
  title?: string;
  subtitle?: string;
}) {
  const router = useRouter();

  // Add dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [newSkillId, setNewSkillId] = useState("");
  const [newYears, setNewYears] = useState("");
  const [adding, setAdding] = useState(false);

  // Edit dialog state
  const [editing, setEditing] = useState<CandidateSkillDTO | null>(null);
  const [editYears, setEditYears] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const usedSkillIds = candidateSkills.map((cs) => cs.skillId);

  async function handleAdd() {
    if (!newSkillId) {
      toast.error("Pick a skill first.");
      return;
    }
    setAdding(true);
    const result = await addSkill({
      skillId: newSkillId,
      yearsOfExperience: newYears,
    });
    setAdding(false);
    if (!result.success) {
      toast.error(result.error ?? "Could not add skill.");
      return;
    }
    toast.success("Skill added");
    setAddOpen(false);
    setNewSkillId("");
    setNewYears("");
    router.refresh();
  }

  function openEdit(cs: CandidateSkillDTO) {
    setEditing(cs);
    setEditYears(String(cs.years));
  }

  async function handleEditSave() {
    if (!editing) return;
    setSavingEdit(true);
    const result = await updateSkillYears(editing.id, editYears);
    setSavingEdit(false);
    if (!result.success) {
      toast.error(result.error ?? "Could not update.");
      return;
    }
    toast.success("Skill updated");
    setEditing(null);
    router.refresh();
  }

  async function handleDelete(id: string) {
    const result = await deleteCandidateSkill(id);
    if (!result.success) {
      toast.error(result.error ?? "Could not remove skill.");
      return;
    }
    toast.success("Skill removed");
    router.refresh();
  }

  const addButton = (
    <Button className={BTN_PRIMARY} onClick={() => setAddOpen(true)}>
      <Plus /> Add Skill
    </Button>
  );

  return (
    <div className="space-y-6 font-body">
      {title && subtitle ? (
        <ProfileSectionHeader title={title} subtitle={subtitle} action={addButton} />
      ) : (
        <div className="flex justify-end">{addButton}</div>
      )}

      {/* Add skill dialog — internals untouched (P4) */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <FormModalContent icon={Sparkles} title="Add Skill" size="sm">
          <FormModalBody>
            <div className="space-y-1.5">
              <Label className={MODAL_LABEL}>
                Skill
                <Req />
              </Label>
              <SkillCombobox
                skills={skillOptions}
                value={newSkillId}
                onChange={setNewSkillId}
                disabledIds={usedSkillIds}
                triggerClassName={cn(MODAL_INPUT, "hover:bg-brand-surface")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-years" className={MODAL_LABEL}>
                Years of Experience
              </Label>
              <Input
                id="new-years"
                inputMode="numeric"
                placeholder="3"
                maxLength={FIELD_LIMITS.yearsDigits}
                value={newYears}
                onChange={(e) => setNewYears(e.target.value)}
                className={MODAL_INPUT}
              />
            </div>
          </FormModalBody>
          <FormModalFooter
            saveLabel="Add Skill"
            saveType="button"
            onSave={handleAdd}
            pending={adding}
          />
        </FormModalContent>
      </Dialog>

      {/* Current skills */}
      {candidateSkills.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No skills added yet"
          description="Add the skills you have and your years of experience with each."
          action={
            <Button className={BTN_PRIMARY} onClick={() => setAddOpen(true)}>
              <Plus /> Add Skill
            </Button>
          }
        />
      ) : (
        <div className={cn(INSET_PANEL, "flex flex-wrap gap-2 px-5 py-4")}>
          {candidateSkills.map((cs) => (
            <span
              key={cs.id}
              className="inline-flex h-[26px] items-center gap-2 rounded-[6px] bg-tag-1 pr-1.5 pl-3 text-small text-brand-ink"
            >
              {/* Chip body opens the existing edit-years dialog */}
              <button
                type="button"
                onClick={() => openEdit(cs)}
                className="inline-flex items-center gap-2 hover:underline"
              >
                <span>{cs.skillName}</span>
                <span aria-hidden className="size-1 rounded-full bg-brand-ink" />
                <span>{cs.years}y</span>
              </button>
              {/* Immediate delete (no confirm) — existing behaviour */}
              <button
                type="button"
                onClick={() => handleDelete(cs.id)}
                aria-label={`Remove ${cs.skillName}`}
                className="rounded p-0.5 text-brand-ink-secondary hover:text-brand-ink"
              >
                <X className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Edit years */}
      <Dialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
      >
        <FormModalContent icon={Sparkles} title={editing?.skillName} size="sm">
          <FormModalBody>
            <div className="space-y-1.5">
              <Label htmlFor="edit-years" className={MODAL_LABEL}>
                Years of Experience
              </Label>
              <Input
                id="edit-years"
                inputMode="numeric"
                maxLength={FIELD_LIMITS.yearsDigits}
                value={editYears}
                onChange={(e) => setEditYears(e.target.value)}
                className={MODAL_INPUT}
              />
            </div>
          </FormModalBody>
          <FormModalFooter
            saveLabel="Save"
            saveType="button"
            onSave={handleEditSave}
            pending={savingEdit}
          />
        </FormModalContent>
      </Dialog>
    </div>
  );
}
