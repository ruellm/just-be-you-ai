import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Resume uploads go through a Server Action as FormData. The default body
    // limit is 1MB; resumes are capped at 5MB, so allow headroom for encoding.
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
