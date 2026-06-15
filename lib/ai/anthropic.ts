import Anthropic from "@anthropic-ai/sdk";

// Thin, server-only Anthropic client. Constructed lazily so importing this
// module never throws when ANTHROPIC_API_KEY is absent — callers (wrapped in
// try/catch) get a clear error only when they actually try to use it.
let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set.");
  }
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

// Question generation + evaluation model (locked for Phase 2 — see CLAUDE.md).
export const QUESTION_MODEL = "claude-sonnet-4-6";
