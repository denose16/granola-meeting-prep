/**
 * Parallel Task API output schemas.
 *
 * Field *descriptions* are the real prompt — Parallel uses them to decide what
 * to research and how to shape each value. We bias every description toward
 * Granola's GTM context (meeting-heavy knowledge workers) so the output is
 * sales-ready, not generic firmographics.
 */

/** JSON schema describing a researched company profile (~11 fields → `core` tier). */
export const COMPANY_SCHEMA = {
  type: "json",
  json_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      legal_name: { type: "string", description: "Official company name." },
      one_liner: {
        type: "string",
        description: "One sentence on what the company does and who it sells to.",
      },
      industry: {
        type: "string",
        description:
          "Primary industry/vertical. Note explicitly if it is software/SaaS, VC/PE/investment, or professional services (consulting, legal, agency, accounting).",
      },
      hq_location: { type: "string", description: "Headquarters city and country." },
      employee_count: {
        type: "string",
        description: "Approximate current headcount, with a number or band (e.g. '500-1000').",
      },
      headcount_trend: {
        type: "string",
        description:
          "Is headcount growing, flat, or shrinking over the last 12 months? Cite the signal (job postings, news, LinkedIn growth).",
      },
      total_funding: {
        type: "string",
        description: "Total funding raised and most recent round + date, or 'Public'/'Bootstrapped'.",
      },
      recent_signals: {
        type: "string",
        description:
          "Buying signals from the last 12 months: funding, leadership hires, product launches, expansion, M&A. 1-3 concise items.",
      },
      meeting_culture_signal: {
        type: "string",
        description:
          "Evidence about how meeting-heavy / collaboration-tool-heavy this org is (use of Zoom/Meet/Slack/Notion, distributed team, client-facing roles). Relevant to Granola fit.",
      },
      open_gtm_roles: {
        type: "string",
        description:
          "Notable currently-open roles, especially sales, revenue, customer-facing or leadership roles that imply growth. 'None found' if none.",
      },
      primary_brand_color_hex: {
        type: "string",
        description:
          "The company's primary brand colour as a hex code (e.g. '#FF6600'), taken from their website/logo. Best guess if not exact.",
      },
      website: { type: "string", description: "Primary website URL." },
    },
    required: [
      "legal_name",
      "one_liner",
      "industry",
      "hq_location",
      "employee_count",
      "headcount_trend",
      "total_funding",
      "recent_signals",
      "meeting_culture_signal",
      "open_gtm_roles",
      "primary_brand_color_hex",
      "website",
    ],
  },
} as const;

/** JSON schema describing a researched person profile (~11 fields → `core` tier). */
export const PERSON_SCHEMA = {
  type: "json",
  json_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      full_name: { type: "string", description: "Full name of the person." },
      current_title: { type: "string", description: "Current job title." },
      current_company: { type: "string", description: "Current employer." },
      seniority: {
        type: "string",
        description: "One of: IC, Manager, Director, VP, C-level, Founder/Owner, Partner.",
      },
      role_function: {
        type: "string",
        description:
          "Primary function: Sales/Revenue, Founder/Exec, Product, Engineering, Marketing, Consulting/Advisory, Investing, Operations, Other.",
      },
      meeting_intensity: {
        type: "string",
        description:
          "How meeting-heavy is this role? (High/Medium/Low) with a one-line rationale. Customer-facing, leadership, investing and consulting roles are High.",
      },
      tenure: { type: "string", description: "How long in current role/company." },
      background: {
        type: "string",
        description: "2-3 sentence professional background: prior companies, expertise, education if notable.",
      },
      linkedin_url: { type: "string", description: "LinkedIn profile URL, or '' if not found." },
      recent_activity: {
        type: "string",
        description:
          "Anything recent and conversation-worthy: posts, talks, podcasts, a job change, press quotes. 'None found' if none.",
      },
      talking_points: {
        type: "string",
        description:
          "2-3 specific, personalised conversation hooks a salesperson could open with, grounded in this person's background and role.",
      },
    },
    required: [
      "full_name",
      "current_title",
      "current_company",
      "seniority",
      "role_function",
      "meeting_intensity",
      "tenure",
      "background",
      "linkedin_url",
      "recent_activity",
      "talking_points",
    ],
  },
} as const;

/** Build the natural-language input string for company research. */
export function companyInput(domain: string): string {
  return `Research the company that owns the domain "${domain}". Identify the operating company behind this domain (not a parent holding company unless that is the brand). Focus on details relevant to a B2B sales conversation.`;
}

/** Build the natural-language input string for person research. */
export function personInput(name: string, domain?: string): string {
  const at = domain ? ` who works at the company behind the domain "${domain}"` : "";
  return `Research the professional "${name}"${at}. Find their current role, background, and anything useful for personalising a sales meeting with them. If multiple people share the name, prefer the one matching the company.`;
}
