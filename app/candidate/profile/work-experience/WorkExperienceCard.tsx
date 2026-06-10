"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDelete } from "@/components/profile/ConfirmDelete";
import type { SkillOption } from "@/components/profile/SkillCombobox";
import { EMPLOYMENT_TYPE_LABELS } from "../schemas";
import { ProjectForm } from "./ProjectForm";
import { deleteProject, deleteWorkExperience } from "./actions";
import type { ProjectDTO, WorkExperienceDTO } from "./WorkExperienceSection";

function dateRange(start: string, end: string, present: boolean): string {
  const s = start ? start.slice(0, 7) : "";
  const e = present ? "Present" : end ? end.slice(0, 7) : "";
  if (!s && !e) return "";
  return [s, e].filter(Boolean).join(" – ");
}

export function WorkExperienceCard({
  experience,
  skillOptions,
  onEdit,
}: {
  experience: WorkExperienceDTO;
  skillOptions: SkillOption[];
  onEdit: () => void;
}) {
  const router = useRouter();
  const [projectOpen, setProjectOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectDTO | null>(null);

  function openAddProject() {
    setEditingProject(null);
    setProjectOpen(true);
  }
  function openEditProject(p: ProjectDTO) {
    setEditingProject(p);
    setProjectOpen(true);
  }
  function handleProjectSuccess() {
    setProjectOpen(false);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base">{experience.position}</CardTitle>
          <p className="text-muted-foreground text-sm">
            {experience.companyName} ·{" "}
            {EMPLOYMENT_TYPE_LABELS[experience.employmentType]}
          </p>
          <p className="text-muted-foreground text-sm">
            {dateRange(
              experience.startDate,
              experience.endDate,
              experience.currentlyWorking
            )}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onEdit}
            aria-label="Edit work experience"
          >
            <Pencil />
          </Button>
          <ConfirmDelete
            onConfirm={() => deleteWorkExperience(experience.id)}
            title="Delete this work experience?"
            description="Its projects will be deleted too. This cannot be undone."
            successMessage="Work experience deleted"
            trigger={
              <Button variant="ghost" size="icon-sm" aria-label="Delete">
                <Trash2 />
              </Button>
            }
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {experience.description ? (
          <p className="text-sm whitespace-pre-line">
            {experience.description}
          </p>
        ) : null}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              Projects ({experience.projects.length})
            </p>
            <Button variant="outline" size="sm" onClick={openAddProject}>
              <Plus /> Add project
            </Button>
          </div>

          {experience.projects.length > 0 ? (
            <div className="space-y-2">
              {experience.projects.map((p) => (
                <div
                  key={p.id}
                  className="bg-muted/40 flex items-start justify-between gap-2 rounded-md border p-3"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium">{p.name}</p>
                    {p.description ? (
                      <p className="text-muted-foreground line-clamp-2 text-sm">
                        {p.description}
                      </p>
                    ) : null}
                    {p.skillNames.length > 0 ? (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {p.skillNames.map((name) => (
                          <Badge
                            key={name}
                            variant="secondary"
                            className="text-xs"
                          >
                            {name}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openEditProject(p)}
                      aria-label="Edit project"
                    >
                      <Pencil />
                    </Button>
                    <ConfirmDelete
                      onConfirm={() => deleteProject(p.id)}
                      title="Delete this project?"
                      successMessage="Project deleted"
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Delete project"
                        >
                          <Trash2 />
                        </Button>
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No projects yet.</p>
          )}
        </div>
      </CardContent>

      {/* Add / edit project dialog */}
      <Dialog open={projectOpen} onOpenChange={setProjectOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingProject ? "Edit project" : "Add project"}
            </DialogTitle>
          </DialogHeader>
          <ProjectForm
            key={editingProject?.id ?? "new"}
            workExperienceId={experience.id}
            project={editingProject}
            skillOptions={skillOptions}
            onSuccess={handleProjectSuccess}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}
