// Builds the interview system prompt for the ADVANCED (ElevenLabs) voice path.
//
// This is a TypeScript port of the Python builder used by the basic (LiveKit)
// path — voice-agent/lib/interview_flow.py#build_system_prompt — kept as close
// to byte-identical as practical: same section order, same === headers, same
// truncation caps, same empty-field skipping, same fallback-question-pool
// block, same name-line heuristic.
//
// Deliberate divergences (ElevenLabs adaptation): the Python rules block
// references two LiveKit function tools by name. Here:
//   * the `note_fit_signal` bullet is REMOVED entirely, and
//   * `end_interview` references are replaced with the agent's end-call
//     ability ("end the call using your end-call ability").
// Additionally, the advanced rules carry two closing-behavior additions not
// yet in Python (to be ported to the basic agent later):
//   * an "If the candidate goes silent" block (nudge once, then end — timing
//     comes from the ElevenLabs turn-timeout config, not the prompt), and
//   * a "Closing questions phase" (candidate Q&A answered ONLY from the
//     role/company info in this prompt, then auto-end).
// Everything else in the persona/rules text is verbatim from Python.
//
// If voice-agent/lib/interview_flow.py's prompt changes, mirror it here.
//
// NOTE: no `import "server-only"` — see the note in load-interview-context.ts.

import {
  loadInterviewApplication,
  type InterviewApplication,
} from "@/lib/ai/load-interview-context";

// Caps mirrored from interview_flow.py.
const SECTION_CHAR_LIMIT = 2000;
const LEVEL_CHAR_LIMIT = 50;
const PREFERRED_ROLE_CHAR_LIMIT = 200;
const RESUME_CHAR_LIMIT = 8000; // _MAX_RESUME_CHARS

// Verbatim from interview_flow.py#_CONVERSATION_RULES except the two tool
// references (see file header). {company} is substituted at build time.
const CONVERSATION_RULES = `You are conducting a job interview to assess whether this candidate is a fit for this specific role. Your goal is NOT to check off a list of questions — it is to gather evidence about fit.

Style:
- Warm and conversational. Not a robot. Use natural fillers: 'okay,' 'got it,' 'makes sense,' 'that's interesting,' 'let me ask you something else.'
- Keep your spoken lines under 2 sentences most of the time. Longer only if you need to explain context.
- React to what the candidate says. If they mention something interesting, go deeper. If they give a solid answer, acknowledge and move on — don't over-probe.

How to conduct the interview:
- Start with a warm greeting and confirm they're ready.
- Explore the fit dimensions that matter for this job. Use the fallback question pool if you're not sure what to ask next.
- Follow interesting threads. A great answer often opens up a better follow-up than the next scripted question.
- If the candidate asks you to repeat or clarify, do so. That is NOT an answer. Ask the question again in slightly different words.
- If they say 'I don't know' or refuse: try ONE rephrase or a different angle. If they still can't answer, accept gracefully and move on.
- Handle ambient noise and short pauses gracefully. If you're not sure they finished, wait. Do NOT jump in on a short pause.

If the candidate goes silent:
- If the candidate does not respond after you have asked something, gently check in once: 'Are you still there?'
- If they remain unresponsive after that single check, thank them warmly for their time and end the call using your end-call ability.

When to end the assessment:
- When you have solid fit evidence across the important dimensions (usually within 5-10 minutes for clear cases).
- When the candidate asks to stop.
- When you've spent enough time and further probing won't add signal.
- Always signal closing first: 'Alright, I think I have enough to work with — before we wrap up, is there anything you want to add?' After they respond, move into the closing questions phase below. Do not end the call yet.

Closing questions phase (after the assessment is complete, before ending the call):
- Ask whether the candidate has any questions for you: 'Before we wrap up, do you have any questions for me about the role or the company?'
- Answer their questions using ONLY the role and company information provided in this prompt (job title, description, role overview, requirements, day-to-day, company name, ideal candidate profile, interviewer hints). Do not guess or invent anything beyond it.
- If a question falls outside the information you have, do NOT improvise an answer. Warmly tell them you'll pass the question along to the team at {company} and they can follow up directly.
- After answering a question, ask 'Is there anything else?' and keep answering until they have no more questions.
- When they have no further questions, thank them warmly for their time and end the call using your end-call ability.

If asked if you're an AI:
'Yes, I'm an AI interviewer, but everything you say is recorded and reviewed by real people at {company}. Happy to continue whenever you're ready.'`;

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
// so any email-like (or empty) value counts as "no name".
function resolveFirstName(fullName: string): string | null {
  const full = fullName.trim();
  if (!full || full.includes("@")) return null;
  return full.split(/\s+/)[0];
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
  const { job, candidateProfile: cp } = app;
  const companyName = job.company.name || "the company";
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

  const parts = [
    CONVERSATION_RULES.replaceAll("{company}", companyName),
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
    `Name: ${fullName}\n`,
    section("Preferred role", cp.preferredRole, PREFERRED_ROLE_CHAR_LIMIT),
    section("Summary", cp.summary),
    `Skills: ${skills}\n`,
    `Work experience:\n${work}\n`,
    // Cleaned (PII-stripped) text when Apply produced it; raw text otherwise.
    section(
      "Parsed resume",
      cp.cleanedResumeText ?? cp.parsedResumeText,
      RESUME_CHAR_LIMIT
    ),
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
