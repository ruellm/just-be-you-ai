// Builds the interview system prompt for the ADVANCED (ElevenLabs) voice path.
//
// The TypeScript twin of the Python builder used by the basic (LiveKit) path,
// voice-agent/lib/interview_flow.py#build_system_prompt: same section order,
// same === headers, same truncation caps, same empty-field skipping, same
// fallback-question-pool block, same name-line heuristic.
//
// The conversation rules (persona, flow, scope control) are NOT in this file.
// Both tiers render them from shared/interview-prompts.json via
// lib/ai/interview-prompts.ts, which also holds the per-tier differences
// (basic has the note_fit_signal/end_interview tools and handles silence in
// code; advanced ends via the agent's end-call ability and carries the
// "If the candidate goes silent" block).
//
// Injection defense: everything the candidate supplied (name, summary, work
// history, resume) sits inside untrusted-data tags with a notice that it is
// data, not instructions, and the rules state that nothing the candidate says
// overrides them.
//
// KNOWN CEILING: the ElevenLabs tier still ships this system prompt to the
// browser (the server-side hardening was reverted), so a candidate who edits
// it in devtools bypasses the scope control on this tier. What holds in that
// case is the evaluator-side defense (lib/ai/evaluate-interview.ts), which
// runs server-side on the transcript.
//
// If the assembly in interview_flow.py changes, mirror it here.
//
// NOTE: no `import "server-only"` — see the note in load-interview-context.ts.

import {
  loadInterviewApplication,
  type InterviewApplication,
} from "@/lib/ai/load-interview-context";
import {
  isPlausibleFirstName,
  renderAgentRules,
  untrustedNotice,
  wrapUntrusted,
} from "@/lib/ai/interview-prompts";
import { resolveApplicationResume } from "@/lib/ai/resume-snapshot";
import { resolveInterviewJob } from "@/lib/prescreen";

// Caps mirrored from interview_flow.py.
const SECTION_CHAR_LIMIT = 2000;
const LEVEL_CHAR_LIMIT = 50;
const PREFERRED_ROLE_CHAR_LIMIT = 200;
const RESUME_CHAR_LIMIT = 8000; // _MAX_RESUME_CHARS

// Mirrors interview_flow.py#_section: skip empty, truncate, "Title: value\n".
function section(
  title: string,
  value: string | null | undefined,
  limit = SECTION_CHAR_LIMIT
): string {
  let v = (value ?? "").trim();
  if (!v) return "";
  if (v.length > limit) v = v.slice(0, limit) + "…[truncated]";
  return `${title}: ${v}\n`;
}

// Mirrors interview_flow.py#_resolve_first_name: load_context falls back to
// the user's email when no real name exists; an email spoken aloud is jarring,
// so any email-like (or empty) value counts as "no name". The name is typed by
// the candidate and is used outside the untrusted-data tags, so anything that
// doesn't look like a name counts as "no name" too.
function resolveFirstName(fullName: string): string | null {
  const full = fullName.trim();
  if (!full || full.includes("@")) return null;
  const first = full.split(/\s+/)[0];
  return isPlausibleFirstName(first) ? first : null;
}

// Mirrors load_context.py#_build_candidate's full_name: firstName/lastName,
// falling back to the user's email, then "Candidate".
function resolveFullName(app: InterviewApplication): string {
  const cp = app.candidateProfile;
  const name = [cp.firstName?.trim(), cp.lastName?.trim()]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || cp.user.email || "Candidate";
}

export function assembleInterviewPrompt(app: InterviewApplication): string {
  const job = resolveInterviewJob(app);
  const cp = app.candidateProfile;
  const companyName = job.companyName;
  const fullName = resolveFullName(app);
  const firstName = resolveFirstName(fullName);

  const nameLine = firstName
    ? `The candidate's first name is ${firstName}. Use it naturally.`
    : "You do not know the candidate's name; do not invent one.";

  const skills =
    cp.skills
      .map(
        (s) =>
          s.skill.name + (s.yearsOfExperience ? ` (${s.yearsOfExperience}y)` : "")
      )
      .join(", ") || "None listed";

  let work: string;
  if (cp.workExperiences.length) {
    work = cp.workExperiences
      .map((w) => {
        // Python renders the raw PostgREST end-date string; here we have a
        // Date, rendered date-only (YYYY-MM-DD) — same information.
        const span = w.currentlyWorking
          ? "current"
          : (w.endDate?.toISOString().slice(0, 10) ?? "");
        return `- ${w.position} at ${w.companyName}` + (span ? ` (${span})` : "");
      })
      .join("\n");
  } else {
    work = "None listed";
  }

  const pool = app.questions.length
    ? app.questions
        .map((q, i) => `${i + 1}. [${q.category}] ${q.text}`)
        .join("\n")
    : "(No pre-generated questions — rely on the job and your judgment.)";

  // The resume as it stood at apply time (pre-snapshot applications fall back
  // to the profile inside resolveApplicationResume).
  const resume = resolveApplicationResume(app);

  // Everything the candidate typed or uploaded, kept together so it can be
  // wrapped as untrusted data.
  const candidateData = [
    `Name: ${fullName}\n`,
    section("Preferred role", cp.preferredRole, PREFERRED_ROLE_CHAR_LIMIT),
    section("Summary", cp.summary),
    `Skills: ${skills}\n`,
    `Work experience:\n${work}\n`,
    // Cleaned (PII-stripped) text when cleanup produced it; raw text otherwise.
    // Both come from the apply-time snapshot, not the live profile.
    section(
      "Parsed resume",
      resume.cleanedText ?? resume.parsedText,
      RESUME_CHAR_LIMIT
    ),
  ].join("");

  const parts = [
    renderAgentRules("advanced", companyName),
    `\n\n${untrustedNotice("agent")}`,
    "\n\n=== THE ROLE ===\n",
    `Job title: ${job.title}\n`,
    `Company: ${companyName}\n`,
    section("Level", job.level, LEVEL_CHAR_LIMIT),
    section("Description", job.description),
    section("Role overview", job.roleOverview),
    section("Requirements", job.requirements),
    section("Day-to-day", job.dayToDay),
    section("Ideal candidate profile", job.idealCandidateProfile),
    section("Passing criteria", job.passingCriteria),
    section("Interviewer hints", job.interviewHints),
    "\n=== THE CANDIDATE ===\n",
    `${wrapUntrusted(candidateData.trimEnd())}\n`,
    "\n=== FALLBACK QUESTION POOL (use only if you're unsure what to ask next) ===\n",
    `${pool}\n`,
    `\n${nameLine}\n`,
  ];
  return parts.join("");
}

/**
 * Load one application and build its advanced-path interview system prompt.
 * Throws if the application doesn't exist.
 */
export async function buildInterviewSystemPrompt(
  applicationId: string
): Promise<string> {
  const application = await loadInterviewApplication(applicationId);
  if (!application) {
    throw new Error(`Application ${applicationId} not found.`);
  }
  return assembleInterviewPrompt(application);
}
