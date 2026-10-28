import type { MetadataRoute } from "next"

/**
 * robots.txt for crawlers.
 *
 * The marketing page is indexable; nothing behind the dashboard or the API is
 * (those pages gate on a session anyway). `www` is the canonical host — the
 * apex `lodgetrack.com` 301s here at the Cloudflare edge (see
 * deploy/vps/README.md "Edge settings"), so crawlers never see two hosts.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/api", "/onboarding", "/rate-limit"],
    },
    sitemap: "https://www.lodgetrack.com/sitemap.xml",
  }
}
