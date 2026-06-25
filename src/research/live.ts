/**
 * Live Researcher — runs real Parallel Task API calls.
 */
import { ParallelClient } from "../parallel/client.js";
import { COMPANY_SCHEMA, PERSON_SCHEMA, companyInput, personInput } from "../parallel/schemas.js";
import type { Attendee, CompanyProfile, PersonProfile, Researched } from "../types.js";
import type { Researcher } from "./orchestrator.js";

export class LiveResearcher implements Researcher {
  readonly live = true;
  private readonly client: ParallelClient;
  private readonly processor: string;

  constructor(apiKey: string, processor: string) {
    this.client = new ParallelClient(apiKey);
    this.processor = processor;
  }

  researchCompany(domain: string): Promise<Researched<CompanyProfile>> {
    return this.client.research<CompanyProfile>(companyInput(domain), COMPANY_SCHEMA, {
      processor: this.processor,
      label: `company:${domain}`,
    });
  }

  researchPerson(attendee: Attendee): Promise<Researched<PersonProfile>> {
    return this.client.research<PersonProfile>(personInput(attendee.name, attendee.domain), PERSON_SCHEMA, {
      processor: this.processor,
      label: `person:${attendee.name}`,
    });
  }
}
