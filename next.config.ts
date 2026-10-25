import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["fernlike-untaken-hurdle.ngrok-free.dev", "*.ngrok-free.dev"],
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
      allowedOrigins: ["fernlike-untaken-hurdle.ngrok-free.dev", "*.ngrok-free.dev"],
    },
  },
  // Cloudflare Pages requires output: 'standalone' for edge deployment
  output: 'standalone',
  // `pg` loads its optional `pg-cloudflare` connector (the Cloudflare-aware
  // socket implementation) only from behind a `try { require(...) }`, so
  // Next's dependency tracer misses it and OpenNext's copied node_modules
  // ends up without it — breaking the Workers build with
  // `Could not resolve "pg-cloudflare"`. Force it into every server trace.
  outputFileTracingIncludes: {
    '/*': ['./node_modules/pg-cloudflare/**/*'],
  },
};

export default nextConfig;
