import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      /**
       * Server Action bodies are capped at 1 MB by default, which a receipt photo
       * exceeds immediately. This sits above MAX_RECEIPT_BYTES (5 MB) in
       * lib/storage.ts with room for the multipart boundaries and the other form
       * fields, so an oversized receipt is refused by the storage layer with a
       * readable message rather than by the framework with a bare 413 — and
       * anything larger is still rejected before it is buffered.
       */
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
