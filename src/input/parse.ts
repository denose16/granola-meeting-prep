/**
 * Input adapters: turn a calendar invite (.ics) or a plain attendee list into
 * a normalised `Meeting`. Internal (Granola-side) attendees are flagged so we
 * only research the prospect side.
 */
import { readFileSync } from "node:fs";
import { INTERNAL_DOMAINS } from "../config.js";
import type { Attendee, Meeting } from "../types.js";

const FREE_EMAIL = new Set([
  "gmail.com",
  "outlook.com",
  "hotmail.com",
  "yahoo.com",
  "icloud.com",
  "proton.me",
]);

function domainOf(email?: string): string | undefined {
  if (!email) return undefined;
  const d = email.split("@")[1]?.toLowerCase().trim();
  return d || undefined;
}

function makeAttendee(name: string, email?: string): Attendee {
  const domain = domainOf(email);
  const isInternal = !!domain && INTERNAL_DOMAINS.has(domain);
  return { name: name.trim() || (email ?? "Unknown"), email, domain, isInternal };
}

/**
 * Parse a minimal subset of iCalendar. Handles ATTENDEE/ORGANIZER lines with
 * CN= (common name) params and mailto: values, plus SUMMARY and DTSTART.
 * Unfolds RFC 5545 line continuations (lines beginning with a space/tab).
 */
export function parseIcs(content: string): Meeting {
  const unfolded = content.replace(/\r?\n[ \t]/g, "");
  const lines = unfolded.split(/\r?\n/);

  let title = "Untitled meeting";
  let startsAt: string | undefined;
  const attendees: Attendee[] = [];

  for (const line of lines) {
    const [rawKey, ...rest] = line.split(":");
    if (!rawKey) continue;
    const value = rest.join(":");
    const key = rawKey.split(";")[0]?.toUpperCase();

    if (key === "SUMMARY") title = value.trim();
    else if (key === "DTSTART") startsAt = value.trim();
    else if (key === "ATTENDEE" || key === "ORGANIZER") {
      const cn = /CN=([^;:]+)/i.exec(rawKey)?.[1]?.replace(/^"|"$/g, "");
      const email = value.replace(/^mailto:/i, "").trim();
      attendees.push(makeAttendee(cn ?? email, email));
    }
  }

  return { title, startsAt, attendees: dedupeAttendees(attendees) };
}

/**
 * Parse a plain attendee list. One attendee per line or comma-separated.
 * Accepts: "Jane Doe <jane@acme.com>", "jane@acme.com", or "Jane Doe, acme.com".
 */
export function parseAttendeeList(input: string, title = "Prospect meeting"): Meeting {
  const tokens = input
    .split(/[\n,]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const attendees: Attendee[] = tokens.map((tok) => {
    const angle = /^(.*?)<([^>]+)>$/.exec(tok);
    if (angle) return makeAttendee(angle[1]!.trim(), angle[2]!.trim());
    if (tok.includes("@")) return makeAttendee(tok.split("@")[0]!, tok);
    return makeAttendee(tok);
  });

  return { title, attendees: dedupeAttendees(attendees) };
}

export function parseInputFile(path: string): Meeting {
  const content = readFileSync(path, "utf8");
  if (path.toLowerCase().endsWith(".ics") || content.includes("BEGIN:VCALENDAR")) {
    return parseIcs(content);
  }
  return parseAttendeeList(content);
}

function dedupeAttendees(attendees: Attendee[]): Attendee[] {
  const seen = new Map<string, Attendee>();
  for (const a of attendees) {
    const key = (a.email ?? a.name).toLowerCase();
    if (!seen.has(key)) seen.set(key, a);
  }
  return [...seen.values()];
}

/**
 * Group prospect attendees by company domain. Internal attendees and free-email
 * domains are excluded from company grouping (free-email people are still
 * researched individually under a synthetic per-person key).
 */
export function groupByCompany(meeting: Meeting): Map<string, Attendee[]> {
  const groups = new Map<string, Attendee[]>();
  for (const a of meeting.attendees) {
    if (a.isInternal) continue;
    const corporate = a.domain && !FREE_EMAIL.has(a.domain);
    const key = corporate ? a.domain! : `person:${(a.email ?? a.name).toLowerCase()}`;
    const list = groups.get(key) ?? [];
    list.push(a);
    groups.set(key, list);
  }
  return groups;
}

export function isCompanyKey(key: string): boolean {
  return !key.startsWith("person:");
}
