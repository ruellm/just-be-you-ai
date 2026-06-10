"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// Placeholder for Step 7. Does NOT create an Application yet.
export function ApplyButton({ disabled = false }: { disabled?: boolean }) {
  return (
    <Button
      size="lg"
      disabled={disabled}
      onClick={() => toast.info("Apply functionality coming soon.")}
    >
      Apply
    </Button>
  );
}
