/**
 * CSV export — one row per attendee, flattening company + person + ICP fields.
 * Useful for dropping the brief into a CRM or spreadsheet.
 */
import type { MeetingBrief } from "../types.js";

const COLUMNS = [
  "meeting",
  "company",
  "domain",
  "icp_score",
  "icp_tier",
  "industry",
  "employee_count",
  "recent_signals",
  "attendee",
  "title",
  "seniority",
  "role_function",
  "meeting_intensity",
  "linkedin_url",
  "talking_points",
] as const;

export function renderCsv(brief: MeetingBrief): string {
  const rows: string[][] = [[...COLUMNS]];
  for (const p of brief.prospects) {
    const c = p.company.value;
    for (const person of p.people) {
      const v = person.value;
      rows.push([
        brief.meeting.title,
        c.legal_name,
        p.domain,
        String(p.icp.score),
        p.icp.tier,
        c.industry,
        c.employee_count,
        c.recent_signals,
        v.full_name,
        v.current_title,
        v.seniority,
        v.role_function,
        v.meeting_intensity,
        v.linkedin_url,
        v.talking_points,
      ]);
    }
  }
  return rows.map((r) => r.map(csvCell).join(",")).join("\n");
}

function csvCell(value: string): string {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
