import type { Level } from "@prisma/client";

// Phase 1 mock: generates fake-but-plausible interview results. Replaced by a
// real AI interview + grading in Phase 2. Uses Math.random — demo only.

export function randomScore(): number {
  // 0.30 – 0.95
  return Math.round((0.3 + Math.random() * 0.65) * 100) / 100;
}

// Weighted: entry 10%, novice 35%, advanced 40%, expert 15%.
export function randomTier(): Level {
  const r = Math.random() * 100;
  if (r < 10) return "entry";
  if (r < 45) return "novice";
  if (r < 85) return "advanced";
  return "expert";
}

const QUESTIONS = [
  "Tell me about your background.",
  "What are you looking for in your next role?",
  "Walk me through a challenging project you worked on.",
  "How do you approach learning something new?",
  "Tell me about a time you worked under pressure.",
  "Why are you interested in this position?",
  "How do you handle feedback and disagreement?",
  "Where do you want to grow over the next year?",
];

const ANSWER_SENTENCES = [
  "I have a few years of hands-on experience in this field and enjoy taking ownership of my work.",
  "In my last role I collaborated closely with a small team to ship features on tight timelines.",
  "I tend to break big problems into smaller pieces and tackle them one at a time.",
  "I learn best by building something real, then refining it based on feedback.",
  "I once had to turn around a stalled project, and communication was the key to getting it back on track.",
  "I value clear expectations and I'm comfortable asking questions when something is unclear.",
  "I'm motivated by work that has real impact on the people who use it.",
  "I try to stay calm under pressure and focus on what I can control.",
  "I've mentored newer teammates and find that teaching deepens my own understanding.",
  "I'm looking for a role where I can keep growing and take on more responsibility over time.",
];

function pickSome<T>(arr: T[], count: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < count && copy.length > 0; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

function randomAnswer(): string {
  const n = 2 + Math.floor(Math.random() * 2); // 2-3 sentences
  return pickSome(ANSWER_SENTENCES, n).join(" ");
}

// 4-6 Q&A "paragraphs", varied per call.
export function buildTranscript(): string {
  const count = 4 + Math.floor(Math.random() * 3); // 4-6
  return pickSome(QUESTIONS, count)
    .map((q) => `AI: ${q}\nCandidate: ${randomAnswer()}`)
    .join("\n\n");
}
