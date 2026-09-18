import { PDFParse } from "pdf-parse";
import * as mammoth from "mammoth";
import {
  extractResumeWithFlags,
  type ResumeFlag,
} from "@/lib/resume-hidden-text";

// Server-only resume text extraction (Phase 1.5). PDF via pdf-parse, DOCX via
// mammoth. No AI — just text. Shared by the upload action and the backfill.
//
// The text returned here is the VISIBLE text only: hidden text (white, tiny,
// invisible, off page...) is dropped by lib/resume-hidden-text.ts and comes
// back separately as flags, so it never reaches any model.

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

// The pre-scan extraction, kept only as the fallback for a broken scan.
async function extractPlainText(buffer: Buffer, ext: string): Promise<string> {
  if (ext === "pdf") {
    // Pass a copy so pdf.js can't detach the caller's buffer.
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      return (await parser.getText()).text ?? "";
    } finally {
      await parser.destroy();
    }
  }
  if (ext === "docx") {
    return (await mammoth.extractRawText({ buffer })).value ?? "";
  }
  throw new Error(`Unsupported resume type: .${ext}`);
}

export interface ParsedResume {
  text: string;
  // Hidden-text evidence. [] = scanned, nothing found.
  flags: ResumeFlag[];
}

// Extract and clean text from a resume buffer. `ext` is "pdf" or "docx".
// Throws on an unsupported type or a parser failure (callers decide how to
// handle). Truncates to RESUME_TEXT_MAX_CHARS for LLM-context safety.
export async function extractResume(
  buffer: Buffer,
  ext: string
): Promise<ParsedResume> {
  let visibleText: string;
  let flags: ResumeFlag[];
  try {
    ({ visibleText, flags } = await extractResumeWithFlags(buffer, ext));
  } catch (scanError) {
    // Flag, never block: if the hidden-text scan itself breaks, fall back to
    // the plain extraction and leave a marker so an admin can see this resume
    // was NOT scanned. A file that can't be parsed at all still throws below.
    console.error("[resume-parse] Hidden-text scan failed; using plain extraction:", scanError);
    visibleText = await extractPlainText(buffer, ext);
    flags = [
      {
        signature: "scan_failed",
        text: "",
        page: null,
        detail: "hidden-text scan failed; resume text stored unscanned",
        dropped: false,
      },
    ];
  }

  let text = normalizeWhitespace(visibleText);
  if (text.length > RESUME_TEXT_MAX_CHARS) {
    console.warn(
      `[resume-parse] Extracted text is ${text.length} chars; truncating to ${RESUME_TEXT_MAX_CHARS}.`
    );
    text = text.slice(0, RESUME_TEXT_MAX_CHARS);
  }
  return { text, flags };
}

// Visible text only, for callers that don't store the flags.
export async function extractResumeText(
  buffer: Buffer,
  ext: string
): Promise<string> {
  return (await extractResume(buffer, ext)).text;
}
