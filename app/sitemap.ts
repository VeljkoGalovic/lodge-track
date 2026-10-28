import type { MetadataRoute } from "next"

/**
 * sitemap.xml — the public surface only.
 *
 * The marketing site is a single page whose sections (#features, #pricing,
 * #about) are anchors, not routes, so the root URL is the whole sitemap.
 * Language is chosen per visitor (cookie / country header) rather than per
 * URL, so there is one entry and no hreflang alternates — pointing several
 * locales at one canonical URL would be false information to Google.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://www.lodgetrack.com",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ]
}
