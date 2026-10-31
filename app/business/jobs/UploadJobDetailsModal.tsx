"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  FileText,
  Loader2,
  RefreshCw,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  FormModalBody,
  FormModalContent,
} from "@/components/profile/FormModal";
import {
  UploadFilePick,
  UPLOAD_CONFIRM_BTN,
} from "@/components/UploadFilePick";
import { BTN_PRIMARY } from "@/app/candidate/profile/ProfileSectionCard";
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

// "Upload Job Details" flow for Post New Job: pick a file (the shared
// UploadFilePick step), watch the two server steps run, then review the
// result. The form values are written by the parent through `onExtracted`;
// this modal only owns the upload.

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
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("pick");
  const [progress, setProgress] = useState<Progress>(0);
  const [summary, setSummary] = useState({ empty: 0, hints: 0 });

  function reset() {
    setFile(null);
    setPhase("pick");
    setProgress(0);
  }

  function handleOpenChange(next: boolean) {
    if (!next && phase === "building") return;
    if (!next) reset();
    onOpenChange(next);
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
          <UploadFilePick
            file={file}
            onFileChange={setFile}
            accept={JD_ACCEPT}
            allowedExts={JD_ALLOWED_EXTS}
            maxBytes={JD_MAX_BYTES}
            typesLabel="PDF, TXT or DOCX"
            helperText="PDF, TXT, or DOCX, up to 5MB"
            onConfirm={runUpload}
            renderConfirm={
              hasValues
                ? (_, run) => (
                    <ConfirmDialog
                      trigger={
                        <Button type="button" className={UPLOAD_CONFIRM_BTN}>
                          Confirm Upload
                        </Button>
                      }
                      icon={RefreshCw}
                      tone="info"
                      title="Replace the current job details?"
                      description="Replace the current job details with the uploaded file? Everything typed so far on this page will be overwritten."
                      confirmLabel="Replace details"
                      onConfirm={run}
                    />
                  )
                : undefined
            }
          />
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
