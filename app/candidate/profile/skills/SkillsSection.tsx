"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  SkillCombobox,
  type SkillOption,
} from "@/components/profile/SkillCombobox";
import { addSkill, deleteCandidateSkill, updateSkillYears } from "./actions";

export type CandidateSkillDTO = {
  id: string;
  skillId: string;
  skillName: string;
  years: number;
};

export function SkillsSection({
  candidateSkills,
  skillOptions,
}: {
  candidateSkills: CandidateSkillDTO[];
  skillOptions: SkillOption[];
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

  return (
    <div className="space-y-4">
      {/* Add skill */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogTrigger asChild>
          <Button>
            <Plus /> Add skill
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add a skill</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Skill</Label>
              <SkillCombobox
                skills={skillOptions}
                value={newSkillId}
                onChange={setNewSkillId}
                disabledIds={usedSkillIds}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-years">Years of experience</Label>
              <Input
                id="new-years"
                inputMode="numeric"
                placeholder="3"
                value={newYears}
                onChange={(e) => setNewYears(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAdd} disabled={adding}>
              {adding ? "Adding…" : "Add skill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Current skills */}
      {candidateSkills.length === 0 ? (
        <p className="text-muted-foreground text-sm">No skills added yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {candidateSkills.map((cs) => (
            <Badge
              key={cs.id}
              variant="secondary"
              className="gap-1.5 py-1 pr-1 pl-2.5 text-sm"
            >
              <button
                type="button"
                onClick={() => openEdit(cs)}
                className="hover:underline"
              >
                {cs.skillName}
                <span className="text-muted-foreground ml-1">
                  · {cs.years}y
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleDelete(cs.id)}
                aria-label={`Remove ${cs.skillName}`}
                className="hover:text-foreground/70"
              >
                <X className="size-3.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Edit years */}
      <Dialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing?.skillName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="edit-years">Years of experience</Label>
            <Input
              id="edit-years"
              inputMode="numeric"
              value={editYears}
              onChange={(e) => setEditYears(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button onClick={handleEditSave} disabled={savingEdit}>
              {savingEdit ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
