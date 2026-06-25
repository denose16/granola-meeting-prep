/**
 * Mock Researcher — returns realistic canned data with zero API spend.
 *
 * Used as the default mode so the whole pipeline (parsing → scoring → branded
 * report → Slack) can be developed and demoed without burning Parallel credit.
 * The fixtures are shaped exactly like real Parallel output, including citations.
 */
import type { Attendee, CompanyProfile, PersonProfile, Researched } from "../types.js";
import type { Researcher } from "./orchestrator.js";

function cite(url: string, title: string): { url: string; title: string; excerpt: string } {
  return { url, title, excerpt: `Mock excerpt from ${title}.` };
}

const COMPANY_FIXTURES: Record<string, CompanyProfile> = {
  "sequoiacap.com": {
    legal_name: "Sequoia Capital",
    one_liner: "Venture capital firm backing founders from seed to growth across technology.",
    industry: "Venture Capital / Investment",
    hq_location: "Menlo Park, USA",
    employee_count: "200-500",
    headcount_trend: "Growing — expanding partner bench and seed program.",
    total_funding: "N/A (investment firm, multi-billion AUM)",
    recent_signals: "Launched new early-stage fund; several new partners hired in 2025.",
    meeting_culture_signal: "Extremely meeting-heavy: partners run back-to-back founder pitches daily.",
    open_gtm_roles: "Talent partner, platform roles open.",
    primary_brand_color_hex: "#1A1A1A",
    website: "https://www.sequoiacap.com",
  },
  "mckinsey.com": {
    legal_name: "McKinsey & Company",
    one_liner: "Global management consulting firm advising the world's largest organisations.",
    industry: "Professional Services / Management Consulting",
    hq_location: "New York, USA",
    employee_count: "45000",
    headcount_trend: "Flat to growing; heavy graduate intake.",
    total_funding: "Private partnership",
    recent_signals: "Expanding AI advisory practice (QuantumBlack).",
    meeting_culture_signal: "Consultants live in client workshops and internal syncs all day.",
    open_gtm_roles: "Engagement managers, AI consultants.",
    primary_brand_color_hex: "#051C2C",
    website: "https://www.mckinsey.com",
  },
  "acme-saas.com": {
    legal_name: "Acme SaaS Inc.",
    one_liner: "Series B project-management SaaS for distributed product teams.",
    industry: "Software / SaaS",
    hq_location: "Austin, USA",
    employee_count: "320",
    headcount_trend: "Growing fast — headcount up ~40% YoY, many open roles.",
    total_funding: "$78M, Series B (Mar 2025)",
    recent_signals: "Closed Series B; launched AI assistant; hiring VP Sales.",
    meeting_culture_signal: "Remote-first, Zoom + Slack + Notion heavy.",
    open_gtm_roles: "VP Sales, 6 AEs, Sales Engineer.",
    primary_brand_color_hex: "#6C5CE7",
    website: "https://www.acme-saas.com",
  },
};

const DEFAULT_COMPANY = (domain: string): CompanyProfile => ({
  legal_name: titleCase(domain.split(".")[0] ?? domain),
  one_liner: `(${domain}) — company researched at run time in live mode.`,
  industry: "Unknown (run with --live to research)",
  hq_location: "Unknown",
  employee_count: "Unknown",
  headcount_trend: "Unknown",
  total_funding: "Unknown",
  recent_signals: "Run with --live to fetch real signals.",
  meeting_culture_signal: "Unknown",
  open_gtm_roles: "Unknown",
  primary_brand_color_hex: "#6C5CE7",
  website: `https://${domain}`,
});

const PERSON_FIXTURES: Record<string, PersonProfile> = {
  "roelof@sequoiacap.com": {
    full_name: "Roelof Botha",
    current_title: "Managing Partner",
    current_company: "Sequoia Capital",
    seniority: "Partner",
    role_function: "Investing",
    meeting_intensity: "High — back-to-back founder meetings and board seats.",
    tenure: "20+ years at Sequoia",
    background: "Former PayPal CFO. Led investments in YouTube, Instagram, Square. Actuarial background.",
    linkedin_url: "https://www.linkedin.com/in/roelofbotha",
    recent_activity: "Spoke on AI investing at a 2025 summit; active board member at multiple unicorns.",
    talking_points:
      "1) Granola fits the back-to-back board/founder meeting cadence VCs live in. 2) His PayPal-mafia network maps to portfolio rollout. 3) AI-native note-taking aligns with his AI investing thesis.",
  },
  "jane@acme-saas.com": {
    full_name: "Jane Okafor",
    current_title: "VP of Sales",
    current_company: "Acme SaaS Inc.",
    seniority: "VP",
    role_function: "Sales/Revenue",
    meeting_intensity: "High — runs discovery, demos and pipeline reviews daily.",
    tenure: "1 year (joined post-Series B)",
    background: "Scaled sales at two prior B2B SaaS startups from Series A to C. Known for rep-enablement.",
    linkedin_url: "https://www.linkedin.com/in/janeokafor",
    recent_activity: "Posting about building a new outbound team after the Series B.",
    talking_points:
      "1) Granola auto-captures discovery calls so new AEs ramp faster. 2) Hiring 6 AEs — onboarding pain is acute now. 3) Remote-first stack (Zoom/Slack) integrates cleanly.",
  },
};

const DEFAULT_PERSON = (a: Attendee): PersonProfile => ({
  full_name: a.name,
  current_title: "Unknown",
  current_company: a.domain ?? "Unknown",
  seniority: "Unknown",
  role_function: "Other",
  meeting_intensity: "Unknown",
  tenure: "Unknown",
  background: "Run with --live to research this person.",
  linkedin_url: "",
  recent_activity: "None found (mock mode).",
  talking_points: "Run with --live to generate personalised talking points.",
});

export class MockResearcher implements Researcher {
  readonly live = false;

  async researchCompany(domain: string): Promise<Researched<CompanyProfile>> {
    const value = COMPANY_FIXTURES[domain] ?? DEFAULT_COMPANY(domain);
    return {
      value,
      evidence: {
        recent_signals: {
          reasoning: "Mock evidence for demonstration.",
          confidence: "high",
          citations: [cite(value.website, `${value.legal_name} — website`)],
        },
      },
    };
  }

  async researchPerson(attendee: Attendee): Promise<Researched<PersonProfile>> {
    const value =
      (attendee.email && PERSON_FIXTURES[attendee.email.toLowerCase()]) || DEFAULT_PERSON(attendee);
    return {
      value,
      evidence: {
        background: {
          reasoning: "Mock evidence for demonstration.",
          confidence: "high",
          citations: value.linkedin_url ? [cite(value.linkedin_url, `${value.full_name} — LinkedIn`)] : [],
        },
      },
    };
  }
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
