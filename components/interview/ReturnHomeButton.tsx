"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmExitInterview } from "./ConfirmExitInterview";

const HOME_HREF = "/candidate/dashboard";
const CLASS =
  "h-[41px] rounded-[12px] bg-brand-secondary px-5 text-small font-medium text-white hover:bg-brand-secondary/90";

// The interview-chrome header's "Return to Home". On the LIVE interview screen
// it is gated behind the exit confirmation (U4 #21) so a misclick can't kill a
// running session; everywhere else in this route group (the result page) it
// stays a plain link. Confirming performs the same navigation as before.
export function ReturnHomeButton() {
  const pathname = usePathname();
  const router = useRouter();
  const onInterview = pathname?.endsWith("/interview") ?? false;

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
