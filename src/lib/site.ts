/**
 * Canonical public site URL — the single source of truth for every
 * user-facing absolute link (share URLs, QR codes, Stripe redirects,
 * metadata, sitemap).
 *
 * harmonyname.com's registration lapsed on 2026-07-13 and was deliberately
 * not renewed, so the default is the Vercel subdomain. If a custom domain
 * comes back, set NEXT_PUBLIC_SITE_URL in Vercel and redeploy — no code
 * change needed. NEXT_PUBLIC_ prefix so the value is inlined into client
 * components at build time as well as being readable on the server.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://harmony-name.vercel.app";

/** Bare host (no scheme) for display in share-card footers. */
export const SITE_HOST = new URL(SITE_URL).host;
