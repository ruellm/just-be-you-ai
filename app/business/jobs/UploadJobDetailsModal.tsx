"use client";

import { useRef, useState, type DragEvent } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  FileText,
  Loader2,
  RefreshCw,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  FormModalBody,
  FormModalContent,
} from "@/components/profile/FormModal";
import {
  BTN_DANGER,
  BTN_PRIMARY,
} from "@/app/candidate/profile/ProfileSectionCard";
import { cn } from "@/lib/utils";
import { analyzeJobDescription, extractJobFileText } from "./ai-actions";
import {
  countEmptyFields,
  countHints,
  JD_ACCEPT,
  JD_ALLOWED_EXTS,
  JD_MAX_BYTES,
  type ExtractedJobFields,
  type JobHints,
} from "./ai-schemas";

// "Upload Job Details" flow for Post New Job: pick a file, watch the two
// server steps run, then review the result. The form values are written by
// the parent through `onExtracted`; this modal only owns the upload.

type Phase = "pick" | "building" | "complete";

// Which of the four progress lines are done. Line 1 is the text extraction;
// lines 2-4 are the single AI call, so they finish together.
type Progress = 0 | 1 | 2;

const PROGRESS_LINES = [
  "Extracting job details from file",
  "Analyzing qualifications",
  "Reading requirements and skills",
  "Checking for missing details",
];

function validate(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!(JD_ALLOWED_EXTS as readonly string[]).includes(ext)) {
    return "Only PDF, TXT or DOCX files are allowed.";
  }
  if (file.size > JD_MAX_BYTES) return "File must be 5MB or smaller.";
  if (file.size === 0) return "That file looks empty.";
  return null;
}

export function UploadJobDetailsModal({
  open,
  onOpenChange,
  hasValues,
  onExtracted,
  onReviewHints,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // The form already has something typed in, so replacing needs a confirm.
  hasValues: boolean;
  onExtracted: (fields: ExtractedJobFields, hints: JobHints) => void;
  onReviewHints: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [phase, setPhase] = useState<Phase>("pick");
  const [progress, setProgress] = useState<Progress>(0);
  const [summary, setSummary] = useState({ empty: 0, hints: 0 });

  function reset() {
    setFile(null);
    setError(null);
    setDragOver(false);
    setPhase("pick");
    setProgress(0);
  }

  function handleOpenChange(next: boolean) {
    if (!next && phase === "building") return;
    if (!next) reset();
    onOpenChange(next);
  }

  function pick(candidate: File) {
    const problem = validate(candidate);
    setError(problem);
    setFile(problem ? null : candidate);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) pick(dropped);
  }

  async function runUpload() {
    if (!file) return;
    setPhase("building");
    setProgress(0);

    const formData = new FormData();
    formData.append("file", file);
    let extracted: Awaited<ReturnType<typeof extractJobFileText>>;
    try {
      extracted = await extractJobFileText(formData);
    } catch {
      extracted = { success: false, error: "Upload failed." };
    }
    if (!extracted.success) {
      setPhase("pick");
      toast.error(extracted.error);
      return;
    }
    setProgress(1);

    let analyzed: Awaited<ReturnType<typeof analyzeJobDescription>>;
    try {
      analyzed = await analyzeJobDescription({ text: extracted.text });
    } catch {
      analyzed = { success: false, error: "Analysis failed." };
    }
    if (!analyzed.success || !analyzed.fields) {
      setPhase("pick");
      toast.error(analyzed.success ? "Analysis failed." : analyzed.error);
      return;
    }
    setProgress(2);

    onExtracted(analyzed.fields, analyzed.hints);
    setSummary({
      empty: countEmptyFields(analyzed.fields),
      hints: countHints(analyzed.hints),
    });
    setPhase("complete");
  }

  const confirmClass = cn(BTN_PRIMARY, "h-10 px-5");

  const title =
    phase === "building"
      ? "Building your job post"
      : phase === "complete"
        ? "Upload Complete"
        : "Upload File";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <FormModalContent icon={UploadCloud} title={title}>
        {phase === "pick" ? (
          <>
            <FormModalBody>
              <div
                role="button"
                tabIndex={0}
                onClick={() => inputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
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
                  "flex min-h-[214px] cursor-pointer flex-col items-center justify-center gap-2 rounded-[12px] border border-dashed p-6 text-center transition-colors",
                  dragOver
                    ? "border-brand-secondary bg-brand-secondary/10"
                    : "border-brand-secondary/60 bg-brand-secondary/5"
                )}
              >
                <FileText
                  className="size-10 text-brand-ink-sidebar"
                  strokeWidth={1.5}
                />
                {file ? (
                  <>
                    <p className="text-small font-semibold text-brand-ink">
                      {file.name}
                    </p>
                    <div className="mt-1 flex gap-2">
                      <Button
                        type="button"
                        className={BTN_PRIMARY}
                        onClick={(e) => {
                          e.stopPropagation();
                          inputRef.current?.click();
                        }}
                      >
                        <RefreshCw /> Replace
                      </Button>
                      <Button
                        type="button"
                        className={BTN_DANGER}
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                          setError(null);
                        }}
                      >
                        <Trash2 /> Delete
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-small font-semibold text-brand-ink-sidebar">
                      Drag or drop your file here
                    </p>
                    <p className="text-meta text-brand-ink-sidebar">
                      PDF, TXT, or DOCX, up to 5MB
                    </p>
                  </>
                )}
                <input
                  ref={inputRef}
                  type="file"
                  accept={JD_ACCEPT}
                  className="hidden"
                  onChange={(e) => {
                    const chosen = e.target.files?.[0];
                    if (chosen) pick(chosen);
                    e.target.value = "";
                  }}
                />
              </div>
              {error ? (
                <p role="alert" className="text-small text-accent-2">
                  {error}
                </p>
              ) : null}
            </FormModalBody>
            <div className="px-6 pb-6">
              <div className="flex justify-end gap-3">
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-[8px] border-brand-border bg-brand-surface px-5 font-body text-small font-medium text-brand-ink shadow-none hover:bg-brand-container"
                  >
                    Cancel
                  </Button>
                </DialogClose>
                {hasValues && file ? (
                  <ConfirmDialog
                    trigger={
                      <Button type="button" className={confirmClass}>
                        Confirm Upload
                      </Button>
                    }
                    icon={RefreshCw}
                    tone="info"
                    title="Replace the current job details?"
                    description="Replace the current job details with the uploaded file? Everything typed so far on this page will be overwritten."
                    confirmLabel="Replace details"
                    onConfirm={runUpload}
                  />
                ) : (
                  <Button
                    type="button"
                    disabled={!file}
                    onClick={runUpload}
                    className={confirmClass}
                  >
                    Confirm Upload
                  </Button>
                )}
              </div>
            </div>
          </>
        ) : phase === "building" ? (
          <FormModalBody className="pb-8">
            <div className="flex items-center gap-3 rounded-[8px] border border-brand-border bg-brand-container px-4 py-3">
              <FileText
                className="size-6 shrink-0 text-brand-secondary"
                strokeWidth={1.5}
              />
              <p className="truncate text-meta text-brand-ink">{file?.name}</p>
            </div>
            <ul className="space-y-3" role="status" aria-live="polite">
              {PROGRESS_LINES.map((label, index) => {
                const done = index === 0 ? progress >= 1 : progress >= 2;
                return (
                  <li key={label} className="flex items-center gap-3">
                    {done ? (
                      <CheckCircle2 className="size-5 shrink-0 text-accent-3" />
                    ) : (
                      <Loader2 className="size-5 shrink-0 animate-spin text-brand-secondary" />
                    )}
                    <span
                      className={cn(
                        "text-small text-brand-ink",
                        done ? "font-normal" : "font-semibold"
                      )}
                    >
                      {label}
                      {done ? "" : "…"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </FormModalBody>
        ) : (
          <FormModalBody className="pb-6">
            <p className="text-small text-brand-ink">
              Please review before publishing. {summary.empty}{" "}
              {summary.empty === 1 ? "field was" : "fields were"} empty in the
              file and {summary.hints} AI{" "}
              {summary.hints === 1 ? "suggestion is" : "suggestions are"} ready.
              Accept or decline each one.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                className="h-9 rounded-[8px] border-brand-border bg-brand-surface px-5 font-body text-small font-semibold text-brand-ink-secondary shadow-none hover:bg-brand-container"
              >
                Dismiss
              </Button>
              <Button
                type="button"
                className={cn(BTN_PRIMARY, "h-9")}
                onClick={() => {
                  handleOpenChange(false);
                  onReviewHints();
                }}
              >
                Review Hints
              </Button>
            </div>
          </FormModalBody>
        )}
      </FormModalContent>
    </Dialog>
  );
}
