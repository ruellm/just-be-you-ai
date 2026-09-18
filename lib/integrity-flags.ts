// Display helpers for the two integrity flags: hidden resume text
// (CandidateProfile.resumeFlagsJson) and interview manipulation attempts
// (InterviewResult.manipulationAttemptsJson).
//
// BUSINESS/ADMIN ONLY. Kept out of lib/applications.ts on purpose: that module
// is imported by candidate-facing client components, and these labels describe
// what the detectors look for. Never import this file from anything under
// app/candidate or app/(interview).

// InterviewResult.manipulationAttemptsJson: what the evaluator saw the
// candidate try, each with the verbatim quote so the reader can judge it.
export type ManipulationAttemptView = {
  quote: string;
  classification: string;
  source: string;
};

export const MANIPULATION_LABELS: Record<string, string> = {
  instruction_injection: "Gave instructions to the AI interviewer",
  mode_change: "Asked the AI to change how it communicates",
  prompt_extraction: "Tried to obtain the AI's instructions or questions",
  scoring_manipulation: "Asked for a particular score or outcome",
};

const MANIPULATION_SOURCE_LABELS: Record<string, string> = {
  transcript: "said in the interview",
  resume: "written in the resume",
  profile: "written in the profile",
};

export function manipulationSourceLabel(source: string): string {
  return MANIPULATION_SOURCE_LABELS[source] ?? source;
}

export function parseManipulationAttempts(json: unknown): ManipulationAttemptView[] {
  if (!Array.isArray(json)) return [];
  const out: ManipulationAttemptView[] = [];
  for (const item of json) {
    if (!item || typeof item !== "object") continue;
    const a = item as Record<string, unknown>;
    if (typeof a.quote !== "string" || !a.quote.trim()) continue;
    out.push({
      quote: a.quote,
      classification: typeof a.classification === "string" ? a.classification : "",
      source: typeof a.source === "string" ? a.source : "transcript",
    });
  }
  return out;
}

// CandidateProfile.resumeFlagsJson: hidden text found in the uploaded resume
// (see lib/resume-hidden-text.ts).
export type ResumeFlagView = {
  signature: string;
  text: string;
  page: number | null;
  detail: string;
  dropped: boolean;
};

export const RESUME_FLAG_LABELS: Record<string, string> = {
  invisible_render_mode: "Invisible text",
  zero_alpha: "Fully transparent text",
  off_page: "Text placed outside the page",
  tiny_font: "Unreadably small text",
  background_color: "Text in the background colour",
  behind_image: "Text hidden behind an image",
  hidden_property: "Text marked hidden",
  metadata: "Long text in file metadata",
  annotation: "Text in an annotation",
  form_field: "Text in a hidden form field",
  comment: "Text in a document comment",
  tracked_deletion: "Text in a tracked deletion",
  ocr_text_layer: "Scanned page with OCR text layer (kept)",
  scan_failed: "Hidden-text scan failed (resume not scanned)",
};

export function parseResumeFlags(json: unknown): ResumeFlagView[] {
  if (!Array.isArray(json)) return [];
  const out: ResumeFlagView[] = [];
  for (const item of json) {
    if (!item || typeof item !== "object") continue;
    const f = item as Record<string, unknown>;
    if (typeof f.signature !== "string") continue;
    out.push({
      signature: f.signature,
      text: typeof f.text === "string" ? f.text : "",
      page: typeof f.page === "number" ? f.page : null,
      detail: typeof f.detail === "string" ? f.detail : "",
      dropped: f.dropped === true,
    });
  }
  return out;
}
