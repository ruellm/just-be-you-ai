"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCw,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDelete } from "@/components/profile/ConfirmDelete";
import { RESUME_ACCEPT, RESUME_MAX_BYTES } from "../schemas";
import { deleteResume, getResumeSignedUrl, uploadResume } from "./actions";

// Staged upload status. The server action (upload → parse → Claude cleanup) is
// a single awaited call, so the stage transitions below are TIMER-DRIVEN
// approximations of the real phases, not actual progress — except "done",
// which is only ever set when the action genuinely resolves successfully. If
// the action resolves before a timer fires, we jump straight to "done"; if the
// cleanup runs long, we simply HOLD on the last stage ("cleaning") until the
// real result comes back.
type UploadStage = "uploading" | "reading" | "cleaning" | "done";

const STAGE_LABELS: Record<UploadStage, string> = {
  uploading: "Uploading your resume...",
  reading: "Reading your resume...",
  cleaning: "Cleaning up your resume...",
  done: "Done",
};

// Timer thresholds (ms from upload start) for advancing to the next stage.
const READING_AT_MS = 1500;
const CLEANING_AT_MS = 3000;
// How long "Done" stays visible before the status resets (the uploader
// usually unmounts before this once router.refresh() lands).
const DONE_RESET_MS = 2000;

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ResumeSection({
  filename,
  uploadedAt,
}: {
  filename: string | null;
  uploadedAt: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<UploadStage | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [dragOver, setDragOver] = useState(false);
  // When a resume exists, the uploader is hidden until "Replace" is clicked.
  const [replacing, setReplacing] = useState(false);

  // In-flight = any stage before the real result has come back.
  const uploading = stage !== null && stage !== "done";

  function clearStageTimers() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }

  useEffect(() => clearStageTimers, []);

  const hasResume = Boolean(filename);
  const showUploader = !hasResume || replacing;

  function validate(file: File): string | null {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (ext !== "pdf" && ext !== "docx") {
      return "Only PDF or DOCX files are allowed.";
    }
    if (file.size > RESUME_MAX_BYTES) {
      return "File must be 5MB or smaller.";
    }
    if (file.size === 0) return "That file looks empty.";
    return null;
  }

  async function handleFile(file: File) {
    const problem = validate(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    const formData = new FormData();
    formData.append("file", file);

    // Kick off the staged status: advance on timers while the awaited action
    // runs. Timers only ever move FORWARD through the pending stages — "done"
    // is set exclusively from the real result below. Past CLEANING_AT_MS
    // there is no further timer, so a long cleanup call holds visibly on
    // "Cleaning up your resume...".
    setStage("uploading");
    clearStageTimers();
    timersRef.current = [
      setTimeout(
        () => setStage((s) => (s === "uploading" ? "reading" : s)),
        READING_AT_MS
      ),
      setTimeout(
        () =>
          setStage((s) =>
            s === "uploading" || s === "reading" ? "cleaning" : s
          ),
        CLEANING_AT_MS
      ),
    ];

    let result: Awaited<ReturnType<typeof uploadResume>>;
    try {
      result = await uploadResume(formData);
    } catch {
      result = { success: false, error: "Upload failed." };
    } finally {
      clearStageTimers();
    }

    if (!result.success) {
      // Error state: drop the stage label entirely (back to the idle drop
      // zone) and surface the failure the same way the rest of the form does.
      setStage(null);
      toast.error(result.error ?? "Upload failed.");
      return;
    }

    // Real success — only now do we show "Done" (never on a timer). If the
    // action beat the later stage timers, we jump straight here.
    setStage("done");
    timersRef.current = [setTimeout(() => setStage(null), DONE_RESET_MS)];
    toast.success("Resume uploaded");
    setReplacing(false);
    router.refresh();
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  async function handleView() {
    const result = await getResumeSignedUrl();
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    window.open(result.url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-4">
      {hasResume ? (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <FileText className="text-muted-foreground size-8 shrink-0" />
              <div className="min-w-0">
                <p className="truncate font-medium">{filename}</p>
                {uploadedAt ? (
                  <p className="text-muted-foreground text-sm">
                    Uploaded {formatDate(uploadedAt)}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleView}>
                <ExternalLink /> View resume
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReplacing((v) => !v)}
              >
                <RefreshCw /> Replace
              </Button>
              <ConfirmDelete
                onConfirm={deleteResume}
                title="Remove your resume?"
                description="The file will be deleted from storage. This cannot be undone."
                successMessage="Resume removed"
                trigger={
                  <Button variant="outline" size="sm">
                    <Trash2 /> Remove
                  </Button>
                }
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {showUploader ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => !uploading && inputRef.current?.click()}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !uploading) {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-10 text-center transition-colors",
            dragOver ? "border-primary bg-muted/50" : "border-input",
            uploading ? "pointer-events-none opacity-70" : "cursor-pointer"
          )}
        >
          {stage ? (
            <>
              {stage === "done" ? (
                <CheckCircle2 className="size-6 text-green-600 dark:text-green-400" />
              ) : (
                <Loader2 className="text-muted-foreground size-6 animate-spin" />
              )}
              <p className="text-sm font-medium" role="status" aria-live="polite">
                {STAGE_LABELS[stage]}
              </p>
            </>
          ) : (
            <>
              <UploadCloud className="text-muted-foreground size-6" />
              <p className="text-sm font-medium">
                Drag &amp; drop your resume here
              </p>
              <p className="text-muted-foreground text-xs">
                PDF or DOCX, up to 5MB
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={(e) => {
                  e.stopPropagation();
                  inputRef.current?.click();
                }}
              >
                Choose file
              </Button>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={RESUME_ACCEPT}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = ""; // allow re-selecting the same file
            }}
          />
        </div>
      ) : null}

      {hasResume && replacing && !uploading ? (
        <Button variant="ghost" size="sm" onClick={() => setReplacing(false)}>
          Cancel
        </Button>
      ) : null}
    </div>
  );
}
