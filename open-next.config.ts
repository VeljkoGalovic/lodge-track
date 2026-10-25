// OpenNext config for this app on Cloudflare Workers.
//
// Every page is server-rendered on demand (no ISR, no `use cache`), so no
// incremental cache is wired up. If ISR or cache components are ever added,
// wire an R2-backed incremental cache — see
// https://opennext.js.org/cloudflare/caching
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({});
