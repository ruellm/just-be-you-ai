"use client";

import { Loader2, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Small outlined "Improve with AI" pill that sits in a section header.
export function ImproveWithAiButton({
  onClick,
  pending,
  disabled,
  className,
}: {
  onClick: () => void;
  pending?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      disabled={disabled || pending}
      className={cn(
        "h-[30px] shrink-0 rounded-[12px] border-brand-secondary bg-brand-surface px-3 font-body text-meta font-semibold text-brand-secondary shadow-none hover:bg-brand-secondary/5 hover:text-brand-secondary",
        className
      )}
    >
      {pending ? <Loader2 className="animate-spin" /> : <WandSparkles />}
      {pending ? "Improving…" : "Improve with AI"}
    </Button>
  );
}
