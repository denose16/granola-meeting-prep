/**
 * Deterministic, explainable ICP scoring.
 *
 * Granola's ICP (from the brief): knowledge workers who run a lot of meetings —
 * concentrated in software companies, VC/PE firms, and professional services.
 *
 * Scoring is done in code (not by the LLM) so it is transparent, tunable, and
 * reproducible. The LLM's job is to *research* the inputs; the rubric below
 * decides the *score*. Every point is traced back to a reason string.
 */
import type { CompanyProfile, IcpScore, PersonProfile } from "../types.js";

const VERTICAL_KEYWORDS = {
  software: ["software", "saas", "tech", "platform", "developer", "cloud", "ai "],
  investing: ["venture", "vc", "private equity", "pe ", "investment", "capital", "asset manager"],
  proServices: ["consult", "advisory", "agency", "legal", "law firm", "accounting", "professional services"],
};

const HIGH_MEETING_FUNCTIONS = ["sales", "revenue", "founder", "exec", "consult", "advisory", "investing", "partner"];

/** Score a single prospect company + its attendees against Granola's ICP. */
export function scoreIcp(company: CompanyProfile, people: PersonProfile[]): IcpScore {
  const reasons: string[] = [];
  let score = 0;

  // 1. Vertical fit — up to 40 pts. The core of the ICP.
  const haystack = `${company.industry} ${company.one_liner}`.toLowerCase();
  if (VERTICAL_KEYWORDS.investing.some((k) => haystack.includes(k))) {
    score += 40;
    reasons.push("+40 Vertical: VC/PE/investment firm — core Granola ICP (meeting-dense, deal-driven).");
  } else if (VERTICAL_KEYWORDS.proServices.some((k) => haystack.includes(k))) {
    score += 38;
    reasons.push("+38 Vertical: professional services — core ICP (client meetings all day).");
  } else if (VERTICAL_KEYWORDS.software.some((k) => haystack.includes(k))) {
    score += 35;
    reasons.push("+35 Vertical: software/SaaS — core ICP (meeting-heavy knowledge workers).");
  } else {
    score += 10;
    reasons.push("+10 Vertical: outside the three core verticals — partial fit only.");
  }

  // 2. Meeting intensity of the actual attendees — up to 30 pts.
  const meetingHeavy = people.filter((p) =>
    HIGH_MEETING_FUNCTIONS.some(
      (f) => p.role_function.toLowerCase().includes(f) || p.meeting_intensity.toLowerCase().startsWith("high"),
    ),
  ).length;
  if (people.length > 0) {
    const ratio = meetingHeavy / people.length;
    const pts = Math.round(ratio * 30);
    score += pts;
    reasons.push(
      `+${pts} Attendees: ${meetingHeavy}/${people.length} in meeting-heavy roles (sales/exec/founder/investor/consultant).`,
    );
  }

  // 3. Company size band — up to 15 pts. Sweet spot is teams big enough to feel
  //    meeting pain but not locked into legacy enterprise tooling.
  const headcount = parseHeadcount(company.employee_count);
  if (headcount !== undefined) {
    if (headcount >= 50 && headcount <= 5000) {
      score += 15;
      reasons.push(`+15 Size: ~${headcount} employees — in the high-fit 50-5,000 band.`);
    } else if (headcount < 50) {
      score += 8;
      reasons.push(`+8 Size: ~${headcount} employees — small but viable.`);
    } else {
      score += 10;
      reasons.push(`+10 Size: ~${headcount} employees — large enterprise, longer cycle.`);
    }
  } else {
    score += 5;
    reasons.push("+5 Size: headcount unclear from research.");
  }

  // 4. Growth / buying signal — up to 15 pts.
  const growth = `${company.headcount_trend} ${company.recent_signals} ${company.open_gtm_roles}`.toLowerCase();
  if (/(grow|hiring|raised|series|expand|launch|new round)/.test(growth)) {
    score += 15;
    reasons.push("+15 Signal: active growth/hiring/funding in the last 12 months — strong timing.");
  } else {
    reasons.push("+0 Signal: no clear recent growth signal found.");
  }

  score = Math.min(100, score);
  const tier: IcpScore["tier"] = score >= 70 ? "Strong" : score >= 45 ? "Moderate" : "Weak";
  return { score, tier, reasons };
}

/** Pull a representative integer headcount from a free-text employee_count field. */
function parseHeadcount(text: string): number | undefined {
  const cleaned = text.replace(/,/g, "").toLowerCase();
  // Ranges like "500-1000" → take the upper bound.
  const range = /(\d+)\s*[-–to]+\s*(\d+)/.exec(cleaned);
  if (range) return Number(range[2]);
  const kPlus = /(\d+(?:\.\d+)?)\s*k/.exec(cleaned);
  if (kPlus) return Math.round(Number(kPlus[1]) * 1000);
  const single = /(\d+)/.exec(cleaned);
  return single ? Number(single[1]) : undefined;
}
