"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ConfirmExitInterview } from "./ConfirmExitInterview";
import { useInterviewLive } from "./InterviewLiveContext";

const HOME_HREF = "/candidate/dashboard";
const CLASS =
  "h-[41px] rounded-[12px] bg-brand-secondary px-5 text-small font-medium text-white hover:bg-brand-secondary/90";

// The interview-chrome header's "Return to Home". While a session is live the
// button is disabled and points the candidate at End Interview; on the rest of
// the interview route it is gated behind the exit confirmation; everywhere
// else in this route group (result and complete pages) it is a plain link.
export function ReturnHomeButton() {
  const pathname = usePathname();
  const router = useRouter();
  const live = useInterviewLive();
  const onInterview = pathname?.endsWith("/interview") ?? false;

  if (live) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {/* Disabled buttons swallow pointer events, so the span carries the tooltip. */}
          <span tabIndex={0} className="inline-flex">
            <Button type="button" disabled className={CLASS}>
              Return to Home
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>Use End Interview to leave the interview.</TooltipContent>
      </Tooltip>
    );
  }

  if (!onInterview) {
    return (
      <Button asChild className={CLASS}>
        <Link href={HOME_HREF}>Return to Home</Link>
      </Button>
    );
  }

  return (
    <ConfirmExitInterview
      onConfirm={() => router.push(HOME_HREF)}
      trigger={
        <Button type="button" className={CLASS}>
          Return to Home
        </Button>
      }
    />
  );
}
