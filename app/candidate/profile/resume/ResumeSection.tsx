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
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/profile/ConfirmDelete";
import { validateUploadFile } from "@/components/UploadFilePick";
import { BTN_DANGER, BTN_INK, INSET_PANEL } from "../ProfileSectionCard";
import {
  RESUME_ACCEPT,
  RESUME_ALLOWED_EXTS,
  RESUME_HELPER_TEXT,
  RESUME_MAX_BYTES,
  RESUME_TYPES_LABEL,
} from "../schemas";
import { deleteResume, getResumeSignedUrl, uploadResume } from "./actions";

// Staged upload status. The server action (upload → parse → Claude cleanup →
// save) is a single awaited call, so the stage transitions below are
// TIMER-DRIVEN approximations of the real phases, not actual progress —
// except "done", which is only ever set when the action genuinely resolves
// successfully. If the action resolves before a timer fires, we jump straight
// to "done"; if the cleanup runs long, we simply HOLD on the last stage
// ("preparing") until the real result comes back.
type UploadStage = "uploading" | "extracting" | "analyzing" | "preparing" | "done";

// In-flight stages, in order. The last one holds until the real result.
const PENDING_STAGES: UploadStage[] = ["uploading", "extracting", "analyzing", "preparing"];

const STAGE_LABELS: Record<UploadStage, string> = {
  uploading: "Uploading document...",
  extracting: "Extracting resume details...",
  analyzing: "Analyzing qualifications...",
  preparing: "Preparing your workspace...",
  done: "Done",
};

const STAGE_SUBLINE = "This may take a while. Please wait.";

// Timer thresholds (ms from upload start) for advancing to each next stage.
// Roughly: upload ~1.5s → text extraction ~1.5s → Claude cleanup (longest)
// → "preparing" (holds until the action resolves; no timer past this).
const EXTRACTING_AT_MS = 1500;
const ANALYZING_AT_MS = 3000;
const PREPARING_AT_MS = 7000;
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

  async function handleFile(file: File) {
    const problem = validateUploadFile(
      file,
      RESUME_ALLOWED_EXTS,
      RESUME_MAX_BYTES,
      RESUME_TYPES_LABEL
    );
    if (problem) {
      toast.error(problem);
      return;
    }
    const formData = new FormData();
    formData.append("file", file);

    // Kick off the staged status: advance on timers while the awaited action
    // runs. Timers only ever move FORWARD through the pending stages — "done"
    // is set exclusively from the real result below. Past PREPARING_AT_MS
    // there is no further timer, so a long cleanup/save holds visibly on
    // "Preparing your workspace...".
    const advanceTo = (target: UploadStage) =>
      setStage((s) =>
        s !== null &&
        s !== "done" &&
        PENDING_STAGES.indexOf(s) < PENDING_STAGES.indexOf(target)
          ? target
          : s
      );
    setStage("uploading");
    clearStageTimers();
    timersRef.current = [
      setTimeout(() => advanceTo("extracting"), EXTRACTING_AT_MS),
      setTimeout(() => advanceTo("analyzing"), ANALYZING_AT_MS),
      setTimeout(() => advanceTo("preparing"), PREPARING_AT_MS),
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
    <div className="space-y-4 font-body">
      {hasResume ? (
        <div
          className={cn(
            INSET_PANEL,
            "flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
          )}
        >
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-[8px] bg-brand-surface text-brand-primary">
              <FileText className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-body font-semibold text-brand-ink">
                {filename}
              </p>
              {uploadedAt ? (
                <p className="text-small text-brand-ink-secondary">
                  Uploaded on {formatDate(uploadedAt)}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button className={BTN_INK} onClick={handleView}>
              <ExternalLink /> View
            </Button>
            {/* The same button opens the upload area and closes it again. */}
            <Button
              className={BTN_INK}
              disabled={uploading}
              onClick={() => setReplacing((v) => !v)}
            >
              {replacing ? (
                <>
                  <X /> Cancel
                </>
              ) : (
                <>
                  <RefreshCw /> Replace
                </>
              )}
            </Button>
            <ConfirmDelete
              onConfirm={deleteResume}
              title="Remove your resume?"
              description="The file will be deleted from storage. This cannot be undone."
              successMessage="Resume removed"
              trigger={
                <Button className={BTN_DANGER}>
                  <Trash2 /> Delete
                </Button>
              }
            />
          </div>
        </div>
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
            "flex flex-col items-center justify-center gap-2 rounded-[12px] border p-10 text-center transition-colors",
            stage
              ? // Upload-status card: solid border, white, ~134px tall.
                "min-h-[134px] border-brand-border bg-brand-surface"
              : dragOver
                ? "border-dashed border-brand-secondary bg-brand-container"
                : "border-dashed border-brand-border bg-brand-surface",
            uploading ? "pointer-events-none" : "cursor-pointer"
          )}
        >
          {stage ? (
            <>
              {stage === "done" ? (
                <CheckCircle2 className="size-6 text-accent-3" />
              ) : (
                <Loader2
                  className="size-[58px] animate-spin text-brand-secondary"
                  strokeWidth={2}
                />
              )}
              <p
                className="pt-1 text-body font-semibold text-brand-ink"
                role="status"
                aria-live="polite"
              >
                {STAGE_LABELS[stage]}
              </p>
              {stage !== "done" ? (
                <p className="text-small text-brand-ink-secondary">{STAGE_SUBLINE}</p>
              ) : null}
            </>
          ) : (
            <>
              <UploadCloud className="size-6 text-brand-primary" />
              <p className="text-small font-medium text-brand-ink">
                Drag &amp; drop your resume here
              </p>
              <p className="text-meta text-brand-ink-secondary">
                {RESUME_HELPER_TEXT}
              </p>
              <Button
                type="button"
                className={cn(BTN_INK, "mt-2")}
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
    </div>
  );
}
