"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormModalContent } from "@/components/profile/FormModal";
import { UploadFilePick } from "@/components/UploadFilePick";
import { BTN_PRIMARY } from "@/app/candidate/profile/ProfileSectionCard";
import {
  RESUME_ACCEPT,
  RESUME_ALLOWED_EXTS,
  RESUME_HELPER_TEXT,
  RESUME_MAX_BYTES,
  RESUME_TYPES_LABEL,
} from "@/app/candidate/profile/schemas";
import { uploadResume } from "@/app/candidate/profile/resume/actions";

// "Upload Resume" from the pre-screening banner. Same upload action and
// hidden-text handling as the Resume card on the profile; this only adds the
// modal around it.

export function UploadResumeModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);

  function handleOpenChange(next: boolean) {
    if (!next && pending) return;
    if (!next) setFile(null);
    onOpenChange(next);
  }

  async function confirm(chosen: File) {
    setPending(true);
    const formData = new FormData();
    formData.append("file", chosen);
    let result: Awaited<ReturnType<typeof uploadResume>>;
    try {
      result = await uploadResume(formData);
    } catch {
      result = { success: false, error: "Upload failed." };
    } finally {
      setPending(false);
    }
    if (!result.success) {
      toast.error(result.error ?? "Upload failed.");
      return;
    }
    toast.success("Resume uploaded");
    setFile(null);
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <FormModalContent icon={UploadCloud} title="Upload File">
        <UploadFilePick
          file={file}
          onFileChange={setFile}
          accept={RESUME_ACCEPT}
          allowedExts={RESUME_ALLOWED_EXTS}
          maxBytes={RESUME_MAX_BYTES}
          typesLabel={RESUME_TYPES_LABEL}
          helperText={RESUME_HELPER_TEXT}
          onConfirm={confirm}
          pending={pending}
        />
      </FormModalContent>
    </Dialog>
  );
}

export function UploadResumeButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        className={BTN_PRIMARY}
        onClick={() => setOpen(true)}
      >
        Upload Resume
      </Button>
      <UploadResumeModal open={open} onOpenChange={setOpen} />
    </>
  );
}
