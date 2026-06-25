/**
 * Configuration + lightweight .env loader.
 *
 * No dependency on `dotenv` — we parse a flat .env file ourselves to keep the
 * dependency surface minimal. Real process env always wins over the file.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadDotEnv(path = ".env"): void {
  let raw: string;
  try {
    raw = readFileSync(resolve(process.cwd(), path), "utf8");
  } catch {
    return; // no .env file — rely on process.env
  }
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadDotEnv();

export const config = {
  parallelApiKey: process.env.PARALLEL_API_KEY ?? "",
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL ?? "",
  defaultProcessor: process.env.PARALLEL_PROCESSOR ?? "core",
} as const;

/** Internal email domains — attendees on these are the Granola-side host, not prospects. */
export const INTERNAL_DOMAINS = new Set(["granola.ai", "granola.so"]);

export function assertApiKey(): string {
  if (!config.parallelApiKey) {
    throw new Error(
      "PARALLEL_API_KEY is not set. Copy .env.example to .env and add your key, " +
        "or run in mock mode (default) without --live.",
    );
  }
  return config.parallelApiKey;
}
