import "server-only";

export function getPublicOrigin(request: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, "");

  const xfHost = request.headers.get("x-forwarded-host");
  const host = xfHost ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`;

  return new URL(request.url).origin;
}
