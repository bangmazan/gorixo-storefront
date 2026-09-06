/// <reference types="astro/client" />
/// <reference path="../worker-configuration.d.ts" />

// Binding Cloudflare (D1 + vars) di-generate ke worker-configuration.d.ts oleh
// `wrangler types`, dan diimpor lewat `import { env } from "cloudflare:workers"`.
