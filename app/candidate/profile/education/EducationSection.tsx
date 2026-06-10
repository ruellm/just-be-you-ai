"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ConfirmDelete } from "@/components/profile/ConfirmDelete";
import { EducationForm } from "./EducationForm";
import { deleteEducation } from "./actions";

export type EducationDTO = {
  id: string;
  school: string;
  country: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate: string;
  currentlyStudying: boolean;
};

function dateRange(e: EducationDTO): string {
  const start = e.startDate ? e.startDate.slice(0, 7) : "";
  const end = e.currentlyStudying ? "Present" : e.endDate ? e.endDate.slice(0, 7) : "";
  if (!start && !end) return "";
  return [start, end].filter(Boolean).join(" – ");
}

export function EducationSection({
  educations,
}: {
  educations: EducationDTO[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EducationDTO | null>(null);

  function openAdd() {
    setEditing(null);
    setOpen(true);
  }
  function openEdit(entry: EducationDTO) {
    setEditing(entry);
    setOpen(true);
  }
  function handleSuccess() {
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button onClick={openAdd}>
            <Plus /> Add education
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit education" : "Add education"}
            </DialogTitle>
          </DialogHeader>
          <EducationForm
            key={editing?.id ?? "new"}
            entry={editing}
            onSuccess={handleSuccess}
          />
        </DialogContent>
      </Dialog>

      {educations.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No education added yet.
        </p>
      ) : (
        <div className="grid gap-3">
          {educations.map((e) => (
            <Card key={e.id}>
              <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
                <div className="space-y-1">
                  <CardTitle className="text-base">{e.school}</CardTitle>
                  <p className="text-muted-foreground text-sm">
                    {[e.degree, e.fieldOfStudy].filter(Boolean).join(", ")}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => openEdit(e)}
                    aria-label="Edit"
                  >
                    <Pencil />
                  </Button>
                  <ConfirmDelete
                    onConfirm={() => deleteEducation(e.id)}
                    successMessage="Education deleted"
                    trigger={
                      <Button variant="ghost" size="icon-sm" aria-label="Delete">
                        <Trash2 />
                      </Button>
                    }
                  />
                </div>
              </CardHeader>
              <CardContent className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
                {e.country ? <span>{e.country}</span> : null}
                {dateRange(e) ? <span>· {dateRange(e)}</span> : null}
                {e.currentlyStudying ? (
                  <Badge variant="secondary">Currently studying</Badge>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
