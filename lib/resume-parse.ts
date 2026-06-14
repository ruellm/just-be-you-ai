import { PDFParse } from "pdf-parse";
import * as mammoth from "mammoth";

// Server-only resume text extraction (Phase 1.5). PDF via pdf-parse, DOCX via
// mammoth. No AI — just text. Shared by the upload action and the backfill.

export const RESUME_TEXT_MAX_CHARS = 30000;

// Collapse runs of spaces/tabs, trim each line, and keep paragraph breaks as
// double newlines.
function normalizeWhitespace(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Extract and clean text from a resume buffer. `ext` is "pdf" or "docx".
// Throws on an unsupported type or a parser failure (callers decide how to
// handle). Truncates to RESUME_TEXT_MAX_CHARS for LLM-context safety.
export async function extractResumeText(
  buffer: Buffer,
  ext: string
): Promise<string> {
  let raw = "";

  if (ext === "pdf") {
    // Pass a copy so pdf.js can't detach the caller's buffer.
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await parser.getText();
      raw = result.text ?? "";
    } finally {
      await parser.destroy();
    }
  } else if (ext === "docx") {
    const result = await mammoth.extractRawText({ buffer });
    raw = result.value ?? "";
  } else {
    throw new Error(`Unsupported resume type: .${ext}`);
  }

  let text = normalizeWhitespace(raw);
  if (text.length > RESUME_TEXT_MAX_CHARS) {
    console.warn(
      `[resume-parse] Extracted text is ${text.length} chars; truncating to ${RESUME_TEXT_MAX_CHARS}.`
    );
    text = text.slice(0, RESUME_TEXT_MAX_CHARS);
  }
  return text;
}
