"use client";

import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { FileText, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";
import { FormModalBody } from "@/components/profile/FormModal";
import {
  BTN_DANGER,
  BTN_PRIMARY,
} from "@/app/candidate/profile/ProfileSectionCard";
import { cn } from "@/lib/utils";

// The pick step shared by the upload modals (job details, resume): drop zone,
// selected-file state with Replace / Delete, and the Cancel / Confirm footer.
// The dialog shell and what happens after Confirm belong to the caller, which
// also owns the selected file so it can show its name on later steps.

export function validateUploadFile(
  file: File,
  allowedExts: readonly string[],
  maxBytes: number,
  typesLabel: string
): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!allowedExts.includes(ext)) {
    return `Only ${typesLabel} files are allowed.`;
  }
  if (file.size > maxBytes) {
    return `File must be ${Math.round(maxBytes / (1024 * 1024))}MB or smaller.`;
  }
  if (file.size === 0) return "That file looks empty.";
  return null;
}

export const UPLOAD_CANCEL_BTN =
  "h-10 rounded-[8px] border-brand-border bg-brand-surface px-5 font-body text-small font-medium text-brand-ink shadow-none hover:bg-brand-container";
export const UPLOAD_CONFIRM_BTN = cn(BTN_PRIMARY, "h-10 px-5");

export function UploadFilePick({
  file,
  onFileChange,
  accept,
  allowedExts,
  maxBytes,
  typesLabel,
  helperText,
  onConfirm,
  confirmLabel = "Confirm Upload",
  pending = false,
  renderConfirm,
}: {
  file: File | null;
  onFileChange: (file: File | null) => void;
  accept: string;
  allowedExts: readonly string[];
  maxBytes: number;
  // Wording for the type error, e.g. "PDF, TXT or DOCX".
  typesLabel: string;
  helperText: string;
  onConfirm: (file: File) => void;
  confirmLabel?: string;
  pending?: boolean;
  // Replaces the default Confirm button, e.g. to put a confirmation gate in
  // front of it. `run` performs the confirm.
  renderConfirm?: (file: File, run: () => void) => ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  function pick(candidate: File) {
    const problem = validateUploadFile(
      candidate,
      allowedExts,
      maxBytes,
      typesLabel
    );
    setError(problem);
    onFileChange(problem ? null : candidate);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (pending) return;
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) pick(dropped);
  }

  const run = () => {
    if (file) onConfirm(file);
  };

  return (
    <>
      <FormModalBody>
        <div
          role="button"
          tabIndex={0}
          onClick={() => !pending && inputRef.current?.click()}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !pending) {
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
            "flex min-h-[214px] flex-col items-center justify-center gap-2 rounded-[12px] border border-dashed p-6 text-center transition-colors",
            dragOver
              ? "border-brand-secondary bg-brand-secondary/10"
              : "border-brand-secondary/60 bg-brand-secondary/5",
            pending ? "pointer-events-none" : "cursor-pointer"
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
                  disabled={pending}
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
                  disabled={pending}
                  className={BTN_DANGER}
                  onClick={(e) => {
                    e.stopPropagation();
                    setError(null);
                    onFileChange(null);
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
              <p className="text-meta text-brand-ink-sidebar">{helperText}</p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={accept}
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
              disabled={pending}
              className={UPLOAD_CANCEL_BTN}
            >
              Cancel
            </Button>
          </DialogClose>
          {file && renderConfirm ? (
            renderConfirm(file, run)
          ) : (
            <Button
              type="button"
              disabled={!file || pending}
              onClick={run}
              className={UPLOAD_CONFIRM_BTN}
            >
              {pending ? "Uploading…" : confirmLabel}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
