/**
 * Branding helpers — fetch the prospect company's logo + derive a safe accent
 * colour so each report carries the customer's branding.
 *
 * Logos come from Clearbit's free logo endpoint (no API key, keyed by domain).
 * The report `<img>` falls back to an initial-letter monogram if the logo 404s
 * (handled inline via onerror in the template).
 */

/** Public logo URL for a domain (no key required). */
export function logoUrl(domain: string): string {
  return `https://logo.clearbit.com/${encodeURIComponent(domain)}?size=128`;
}

/** Validate/normalise a hex colour from research; fall back to Granola purple. */
export function safeAccent(hex: string | undefined, fallback = "#6C5CE7"): string {
  if (!hex) return fallback;
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  return m ? `#${m[1]}` : fallback;
}

/** Pick black or white text for legibility on a given background hex. */
export function readableTextOn(hex: string): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  // Relative luminance (sRGB approximation).
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#111111" : "#ffffff";
}

/** First letters of a name, for the monogram fallback. */
export function monogram(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}
