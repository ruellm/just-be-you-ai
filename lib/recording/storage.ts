// Naming shared by the browser recorder, the server actions and the scripts.
// No server-only imports so scripts and client code can both load it.

export const RECORDINGS_BUCKET = "interview-recordings";
export const RETENTION_DAYS = 90;

// Tried in this order; the first the browser supports is used.
export const RECORDING_MIME_TYPES = [
  "video/webm;codecs=vp8,opus",
  "video/webm",
  "video/mp4",
] as const;
export type RecordingMimeType = (typeof RECORDING_MIME_TYPES)[number];

export function extensionForMimeType(mimeType: string): string {
  return mimeType.startsWith("video/mp4") ? "mp4" : "webm";
}

export function partFileName(partNumber: number, mimeType: string): string {
  return `part-${String(partNumber).padStart(4, "0")}.${extensionForMimeType(mimeType)}`;
}

export function partObjectPath(
  storagePrefix: string,
  partNumber: number,
  mimeType: string
): string {
  return `${storagePrefix}/${partFileName(partNumber, mimeType)}`;
}
