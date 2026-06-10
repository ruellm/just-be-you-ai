"use client";

import { useTransition } from "react";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getCandidateResumeSignedUrl } from "./actions";

export function ViewResumeButton({
  candidateProfileId,
}: {
  candidateProfileId: string;
}) {
  const [pending, startTransition] = useTransition();

  function view() {
    startTransition(async () => {
      const result = await getCandidateResumeSignedUrl(candidateProfileId);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={view} disabled={pending}>
      <ExternalLink /> View resume
    </Button>
  );
}
