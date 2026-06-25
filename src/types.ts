/**
 * Shared domain types for the meeting-prep pipeline.
 *
 * These are deliberately decoupled from the Parallel SDK response shapes: the
 * research layer maps raw Parallel output into these clean types, so the rest
 * of the app (scoring, rendering, Slack) never touches vendor structures.
 */

/** A single web citation backing a researched field. */
export interface Citation {
  url: string;
  title?: string;
  excerpt?: string;
}

/** A researched value plus the evidence Parallel used to produce it. */
export interface Researched<T> {
  value: T;
  /** Per-field reasoning + citations, keyed by field name. */
  evidence: Record<string, { reasoning: string; citations: Citation[]; confidence?: string }>;
}

/** A meeting attendee parsed from the input (invite or attendee list). */
export interface Attendee {
  name: string;
  email?: string;
  /** Email domain, used as the company key (e.g. "acme.com"). */
  domain?: string;
  /** True for the Granola-side host(s) we should not research as prospects. */
  isInternal?: boolean;
}

/** A meeting to be prepped. */
export interface Meeting {
  title: string;
  startsAt?: string;
  attendees: Attendee[];
}

/** Structured company research (mirrors the company output schema). */
export interface CompanyProfile {
  legal_name: string;
  one_liner: string;
  industry: string;
  hq_location: string;
  employee_count: string;
  headcount_trend: string;
  total_funding: string;
  recent_signals: string;
  meeting_culture_signal: string;
  open_gtm_roles: string;
  primary_brand_color_hex: string;
  website: string;
}

/** Structured person research (mirrors the person output schema). */
export interface PersonProfile {
  full_name: string;
  current_title: string;
  current_company: string;
  seniority: string;
  role_function: string;
  meeting_intensity: string;
  tenure: string;
  background: string;
  linkedin_url: string;
  recent_activity: string;
  talking_points: string;
}

/** Deterministic, explainable ICP fit scoring for a company. */
export interface IcpScore {
  /** 0-100. */
  score: number;
  tier: "Strong" | "Moderate" | "Weak";
  /** Human-readable bullets explaining each dimension's contribution. */
  reasons: string[];
}

/** Everything needed to render one prospect's section of the brief. */
export interface ProspectResearch {
  domain: string;
  company: Researched<CompanyProfile>;
  people: Array<Researched<PersonProfile> & { attendee: Attendee }>;
  icp: IcpScore;
}

/** The fully assembled brief for a single meeting. */
export interface MeetingBrief {
  meeting: Meeting;
  generatedAt: string;
  /** Whether real Parallel calls were made (false = mock fixtures). */
  live: boolean;
  prospects: ProspectResearch[];
}
