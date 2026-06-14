import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse (pdfjs-dist) and mammoth do Node-side file/dynamic work; keep them
  // out of the bundler so they're required at runtime from node_modules.
  serverExternalPackages: ["pdf-parse", "mammoth"],
  experimental: {
    // Resume uploads go through a Server Action as FormData. The default body
    // limit is 1MB; resumes are capped at 5MB, so allow headroom for encoding.
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
