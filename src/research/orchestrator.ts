/**
 * Orchestration: turn a parsed Meeting into a fully-researched MeetingBrief.
 *
 * The `Researcher` interface decouples orchestration from the data source, so
 * the exact same pipeline runs against live Parallel calls or local mock
 * fixtures (zero-spend development + deterministic demos).
 */
import { groupByCompany, isCompanyKey } from "../input/parse.js";
import type {
  Attendee,
  CompanyProfile,
  Meeting,
  MeetingBrief,
  PersonProfile,
  ProspectResearch,
  Researched,
} from "../types.js";
import { scoreIcp } from "./icp.js";

export interface Researcher {
  readonly live: boolean;
  researchCompany(domain: string): Promise<Researched<CompanyProfile>>;
  researchPerson(attendee: Attendee): Promise<Researched<PersonProfile>>;
}

export async function buildBrief(meeting: Meeting, researcher: Researcher): Promise<MeetingBrief> {
  const groups = groupByCompany(meeting);

  // Fan out: every company + every person runs concurrently. Parallel handles
  // the heavy lifting; we just await the lot.
  const prospects = await Promise.all(
    [...groups.entries()].map(([key, attendees]) => researchGroup(key, attendees, researcher)),
  );

  // Order by ICP score, hottest prospect first.
  prospects.sort((a, b) => b.icp.score - a.icp.score);

  return {
    meeting,
    generatedAt: new Date().toISOString(),
    live: researcher.live,
    prospects,
  };
}

async function researchGroup(
  key: string,
  attendees: Attendee[],
  researcher: Researcher,
): Promise<ProspectResearch> {
  const domain = isCompanyKey(key) ? key : (attendees[0]?.domain ?? key.replace(/^person:/, ""));

  const [company, people] = await Promise.all([
    researcher.researchCompany(domain),
    Promise.all(
      attendees.map(async (attendee) => ({
        attendee,
        ...(await researcher.researchPerson(attendee)),
      })),
    ),
  ]);

  const icp = scoreIcp(
    company.value,
    people.map((p) => p.value),
  );

  return { domain, company, people, icp };
}
