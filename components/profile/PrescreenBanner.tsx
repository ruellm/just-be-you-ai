import { Check } from "lucide-react";
import { PRESCREEN_DURATION_MINUTES } from "@/lib/prescreen";
import { cn } from "@/lib/utils";
import { StartPrescreenButton } from "./StartPrescreenButton";
import { UploadResumeButton } from "./UploadResumeModal";

// Top-of-profile card walking the candidate through resume upload and the
// pre-screening interview. The "Required" badge is display only: applying
// works the same whether or not the pre-screen is done.

type StepState = "done" | "active" | "todo";

function Step({
  number,
  label,
  state,
}: {
  number: number;
  label: string;
  state: StepState;
}) {
  return (
    <li className="flex items-center gap-3">
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full text-body font-bold text-white",
          state === "done" && "bg-accent-3",
          state === "active" && "bg-brand-secondary",
          state === "todo" && "bg-brand-border"
        )}
      >
        {state === "done" ? <Check className="size-4" strokeWidth={3} /> : number}
      </span>
      <span
        className={cn(
          "text-body",
          state === "active"
            ? "font-semibold text-brand-primary"
            : "font-medium text-brand-ink-sidebar"
        )}
      >
        {label}
      </span>
    </li>
  );
}

export function PrescreenBanner({
  hasResume,
  prescreenDone,
}: {
  hasResume: boolean;
  prescreenDone: boolean;
}) {
  const steps: { label: string; state: StepState }[] = [
    { label: "Resume upload", state: hasResume ? "done" : "active" },
    {
      label: "Pre-screening",
      state: prescreenDone ? "done" : hasResume ? "active" : "todo",
    },
    { label: "Visible to employers", state: prescreenDone ? "done" : "todo" },
  ];

  return (
    <section className="space-y-5 rounded-[12px] border border-brand-border bg-brand-surface p-6 sm:p-8">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-body text-heading font-semibold tracking-[-0.5px] text-brand-primary">
            Complete your Pre-screening Interview
          </h2>
          <span className="inline-flex h-[26px] items-center rounded-[8px] bg-accent-2 px-4 text-small text-brand-canvas">
            Required
          </span>
        </div>
        <p className="max-w-4xl text-body text-brand-ink">
          Our AI interviewer will chat with you for about{" "}
          {PRESCREEN_DURATION_MINUTES} minutes so employers can see a clear
          baseline of your skills. Your profile stays hidden from employers
          until you finish.
        </p>
      </div>

      <ol className="flex flex-wrap gap-x-8 gap-y-3">
        {steps.map((step, i) => (
          <Step key={step.label} number={i + 1} label={step.label} state={step.state} />
        ))}
      </ol>

      {prescreenDone ? null : hasResume ? (
        <StartPrescreenButton />
      ) : (
        <UploadResumeButton />
      )}
    </section>
  );
}
