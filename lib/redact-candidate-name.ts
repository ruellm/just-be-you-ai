// Hides a candidate's name in evaluator-written text before it reaches a
// company that has not unlocked the profile. Runs on the server so the name
// never enters the page payload. The admin views do not use this.

export type CandidateNameSource = {
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  email?: string | null;
};

export type TextRedactor = (text: string) => string;
export type NameRedactor = TextRedactor;

const PLACEHOLDER = "the candidate";
// Single letters would match too much (initials, "a").
const MIN_FORM_CHARS = 2;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function words(value: string | null | undefined): string[] {
  return (value ?? "").trim().split(/\s+/).filter(Boolean);
}

// Spaces inside a multi-word form match any whitespace run.
function formPattern(form: string): string {
  return form.split(/\s+/).map(escapeRegExp).join("\\s+");
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function startsSentence(text: string, index: number): boolean {
  for (let i = index - 1; i >= 0; i--) {
    const ch = text[i];
    if (ch === "\n") return true;
    if (/[\s"'“‘(\[]/.test(ch)) continue;
    return /[.!?]/.test(ch);
  }
  return true;
}

/**
 * Replaces every whole-word occurrence of the given phrases with the
 * placeholder, capitalised at sentence start. Longest phrases win. A trailing
 * 's or ’s is left in place, so "Bernard's" becomes "the candidate's".
 */
export function buildPhraseRedactor(
  phrases: string[],
  placeholder: string,
  { caseSensitive = false }: { caseSensitive?: boolean } = {}
): TextRedactor {
  const forms = [...new Set(phrases.map((p) => p.trim()))]
    .filter((form) => form.length >= MIN_FORM_CHARS)
    .sort((a, b) => b.length - a.length);
  if (forms.length === 0) return (text) => text;
  const pattern = new RegExp(
    `(?<![\\p{L}\\p{N}])(?:${forms.map(formPattern).join("|")})(?![\\p{L}\\p{N}])`,
    caseSensitive ? "gu" : "giu"
  );
  return (text) =>
    text.replace(pattern, (_match, offset: number, whole: string) =>
      startsSentence(whole, offset) ? capitalize(placeholder) : placeholder
    );
}

export function buildCandidateNameRedactor(
  source: CandidateNameSource
): NameRedactor {
  const first = words(source.firstName);
  const middle = words(source.middleName);
  const last = words(source.lastName);

  // Multi-word forms and the email are specific enough to match in any case.
  const anyCase: string[] = [];
  const addMultiWord = (parts: string[]) => {
    if (parts.length > 1) anyCase.push(parts.join(" "));
  };
  addMultiWord([...first, ...middle, ...last]);
  addMultiWord([...first, ...last]);
  addMultiWord(first);
  addMultiWord(middle);
  addMultiWord(last);
  const email = (source.email ?? "").trim();
  if (email) {
    anyCase.push(email);
    const local = email.split("@")[0];
    if (local) anyCase.push(local);
  }

  // Single name parts only as written in the profile: many first names here
  // are ordinary words too (May, Joy, Grace, Faith, Hope, Will).
  const exactCase = [...first, ...middle, ...last];

  const redactPhrases = buildPhraseRedactor(anyCase, PLACEHOLDER);
  const redactWords = buildPhraseRedactor(exactCase, PLACEHOLDER, {
    caseSensitive: true,
  });
  return (text) => redactWords(redactPhrases(text));
}

// The stored rubric breakdown carries one evidence quote per sub-criterion.
// Returns the same shape with those quotes redacted; anything unexpected is
// passed through untouched for the display parser to reject.
export function redactRubricEvidence(json: unknown, redact: NameRedactor): unknown {
  if (!json || typeof json !== "object" || Array.isArray(json)) return json;
  const root = json as Record<string, unknown>;
  if (!Array.isArray(root.categories)) return json;
  return {
    ...root,
    categories: root.categories.map((cat) => {
      if (!cat || typeof cat !== "object" || Array.isArray(cat)) return cat;
      const c = cat as Record<string, unknown>;
      if (!Array.isArray(c.subCriteria)) return cat;
      return {
        ...c,
        subCriteria: c.subCriteria.map((sub) => {
          if (!sub || typeof sub !== "object" || Array.isArray(sub)) return sub;
          const s = sub as Record<string, unknown>;
          return typeof s.evidence === "string"
            ? { ...s, evidence: redact(s.evidence) }
            : sub;
        }),
      };
    }),
  };
}
