# 🥣 Granola Meeting-Prep

**A GTM automation that turns a calendar invite into a branded pre-meeting research brief — powered by [Parallel.ai](https://parallel.ai) web research.**

> **TL;DR** — Point it at a `.ics` invite (or a list of attendees). For every prospect it runs Parallel Task API research on the **company** and each **person**, scores the account against Granola's ICP with a transparent rubric, and produces three outputs: a **branded HTML report** (carrying each prospect's own logo + brand colour), a **CSV** for your CRM, and a **Slack digest**. Runs in **mock mode by default ($0 spend)**; add `--live` for real research. Verified live against Parallel — see [sample output](#sample-output).

---

## 1. The brief (as I understood it)

Granola set the task: **sign up for [Parallel.ai](https://parallel.ai) and build a working GTM automation that a company like Granola would actually use, producing real output** (a Slack message, a CSV, a formatted report, or similar). Parallel is the enrichment/research layer — "programmable web research" run against companies and people at scale.

Three options were offered; the choice was mine:

1. **Pre-meeting research brief** — given a calendar invite or attendee list, research each person + company and produce a structured briefing doc. ← **I picked this one.**
2. Signal-based Slack alert — monitor target companies for a buying signal and post a digest to Slack.
3. ICP qualifier — score a list of domains against Granola's ICP and explain the reasoning.

Submission is a GitHub link, judged on the automation *working* and on the code being **clean / maintainable / legible**.

**Why option 1:** it's the most on-brand for Granola. Granola is an AI notepad for people who live in meetings; this is its natural bookend — Granola captures what happens *in* the meeting, this prepares you *before* it. It's also a genuine GTM motion (rep enablement for the prospect calls an AE/SE runs all week), and it lets me fold option 3's ICP scoring in as one section of each brief — so the single build covers two of the three options.

## 2. What I built & how it meets the brief

| Brief requirement | How this satisfies it |
|---|---|
| Use Parallel.ai as the research layer | Every company + person is researched via the Parallel **Task API** with typed JSON output schemas; field descriptions are the prompt, biased to Granola's GTM context. Citations from the research `basis` are surfaced as Sources. |
| A GTM automation useful to a company *like Granola* | A pre-meeting brief generator tuned to Granola's exact ICP (software / VC-PE / professional services, meeting-heavy roles) — and meta-relevant to a meeting product. |
| Produce **real output** (Slack / CSV / report) | Produces **all three**: a branded HTML report, a CSV, and a Slack Block Kit digest. |
| "or similar" / formatted, branded report | Each prospect's report card carries **their own logo + brand accent colour** (researched by Parallel) — a brief about Stripe looks like Stripe. |
| Clean / maintainable / legible code | Mock-first architecture, a single `Researcher` interface, vendor isolation behind one client file, scoring as transparent code (not LLM), tiny dependency surface. See [Design notes](#design-notes). |
| It should actually work | Verified end-to-end: typecheck clean, full mock run, **a real live Parallel run on Stripe** (committed in `samples/output/`). |

## 3. What it is & what it's designed to do — outline

A small, single-purpose TypeScript CLI. You hand it a meeting; it hands back a prep pack.

- **Input** (`src/input`) — parse a `.ics` calendar invite or a plain attendee list; drop Granola-side (internal) attendees; group the rest by company domain.
- **Research** (`src/parallel`, `src/research`) — for each prospect company and each attendee, run a Parallel Task; map the vendor response into a clean `Researched<T>` carrying the value plus per-field reasoning + citations.
- **Score** (`src/research/icp.ts`) — rate each account 0–100 against Granola's ICP with a deterministic, explainable rubric (vertical fit · attendee meeting-intensity · size band · growth signal). Every point is traceable to a reason shown in the report.
- **Render** (`src/output`, `src/branding`) — emit a **branded HTML report**, a **CSV** for the CRM, and a **Slack digest**. Prospects are ranked hottest-first.
- **Modes** — runs in **mock mode by default** (zero API spend, deterministic) or `--live` for real Parallel calls. The pipeline is identical either way, so the demo never breaks.

Designed to do one job well: turn "I've got three calls tomorrow" into three ranked, citation-backed, branded briefs — at roughly $0.10 a meeting.

## Why this, for Granola

Granola is an AI notepad for people who live in meetings — knowledge workers at **software companies, VC/PE firms, and professional services orgs**. This tool is the natural bookend to that product: Granola captures what happens *in* the meeting; this prepares you *before* it.

As a GTM motion it's a rep-enablement automation: drop tomorrow's prospect calls in, get a ranked, citation-backed brief for each one. The ICP rubric is tuned to exactly the segments above, so the score also tells an SDR/AE **who's worth the prep**.

## What it does

```
calendar invite / attendee list
        │
        ▼
  parse + dedupe by company domain        (src/input)
        │
        ▼
  Parallel Task API  ──►  company profile + per-person profile   (src/research, src/parallel)
        │                  (each field carries reasoning + citations)
        ▼
  ICP scoring  (deterministic, explainable rubric)               (src/research/icp.ts)
        │
        ▼
  outputs:  branded HTML report · CSV · Slack digest             (src/output, src/branding)
```

- **Company research** (~11 fields): industry/vertical, headcount + trend, funding, recent buying signals, meeting-culture signal, open GTM roles, primary brand colour, etc.
- **Person research** (~11 fields): title, seniority, function, **meeting intensity**, background, recent activity, and 2–3 personalised **talking points**.
- **ICP score (0–100 + tier)**: computed in code from the researched signals so every point is traceable — vertical fit (40) · attendee meeting-intensity (30) · company size band (15) · growth signal (15). The "why" is shown in the report.
- **Branding**: each prospect's card uses their **own logo** (Clearbit, key-less; graceful monogram fallback) and **brand accent colour** (researched by Parallel). A brief about Stripe looks like Stripe.

## How Parallel.ai is used

- **Task API** with a typed JSON `output_schema` per entity — the field *descriptions* are the prompt, biased toward Granola's GTM context. Default processor is **`core`** (~10 fields, ~$0.025/run); override with `--processor`.
- The SDK response is normalised into a clean `Researched<T>` (value + per-field `reasoning`/`citations`) in `src/parallel/client.ts` — **nothing above that layer imports the vendor SDK**, so swapping research providers touches one file.
- Citations from the research `basis` are surfaced as **Sources** in the report.

## Setup

```bash
npm install
cp .env.example .env        # add your PARALLEL_API_KEY (https://platform.parallel.ai)
```

`.env` keys:

| Var | Required | Purpose |
|---|---|---|
| `PARALLEL_API_KEY` | for `--live` | Parallel API key |
| `SLACK_WEBHOOK_URL` | optional | If set, posts the digest to Slack; else writes `out/slack-payload.json` |
| `PARALLEL_PROCESSOR` | optional | Default processor tier (`core`) |

## Usage

```bash
# Mock mode — full pipeline, zero API spend (default)
npm run brief -- --input samples/sample-meeting.ics

# Live research
npm run brief -- --input samples/sample-meeting.ics --live --processor core

# Ad-hoc attendees, no file
npm run brief -- --attendees "Jane Okafor <jane@acme-saas.com>, Roelof Botha <roelof@sequoiacap.com>" --live
```

Outputs land in `out/` (gitignored): `<meeting>.html`, `<meeting>.csv`, and the Slack payload. The console prints the ICP ranking.

| Flag | Default | Notes |
|---|---|---|
| `--input <file>` | — | `.ics` invite or plain attendee list (`.txt`) |
| `--attendees "<list>"` | — | Comma/newline list; `Name <email>`, `email`, or `Name` |
| `--live` | off | Make real Parallel calls (otherwise mock fixtures) |
| `--processor <tier>` | `core` | `lite · base · core · pro · ultra` |
| `--out <dir>` | `out` | Output directory |

## Sample output

**⭐ Flagship showcase — a full live multi-attendee brief:**
[**▶ View the rendered Granola × Linear brief**](https://htmlpreview.github.io/?https://github.com/denose16/granola-meeting-prep/blob/main/samples/output/showcase-live-granola-x-linear.html)
*(or the [raw HTML](samples/output/showcase-live-granola-x-linear.html) / [CSV](samples/output/showcase-live-granola-x-linear.csv))*

A real, live Parallel run on a plausible warm-intro deal: **Granola → Linear, introduced via Sequoia** (Sequoia did lead Linear's Series B). Three real attendees across two companies and two verticals (SaaS + VC), each card branded with the company's own colour, ranked by ICP. Linear's brief surfaces its real $82M Series C and $100M revenue milestone — live, with citations.

Other committed samples in [`samples/output/`](samples/output):

- **`sample-live-stripe.html`** — real Parallel research on Stripe / Patrick Collison (ICP 95, Strong).
- **`sample-mock-multi-company.html`** — three-company mock brief (Sequoia, Acme SaaS, McKinsey) showing branding + ranking at $0 spend.
- **`*-slack-payload.json`** — the Slack Block Kit digests.

> Note: GitHub serves `.html` as source text — use the **View** link above (or download the file) to see the rendered, branded report.

## Cost

`core` = **$0.025/run**. A 3-attendee / 1-company meeting ≈ 4 runs ≈ **$0.10**. Mock mode is free, so develop and demo at $0 and only spend on `--live`.

## Design notes

- **Mock-first.** A `Researcher` interface (`src/research/orchestrator.ts`) has `LiveResearcher` and `MockResearcher` implementations. The identical pipeline runs against both — zero-spend dev, deterministic demos, and the demo never breaks if a key is missing.
- **Scoring is code, not LLM.** Research is probabilistic; the *score* is a transparent, tunable rubric, so it's reproducible and explainable.
- **Vendor isolation.** Parallel types live only in `src/parallel/`; the domain types in `src/types.ts` are clean.
- **No heavy deps.** Just the Parallel SDK + `tsx`/`typescript`. The `.env` loader and `.ics` parser are tiny and dependency-free.

## Project layout

```
src/
  index.ts              CLI entry
  config.ts             env loading + internal-domain list
  types.ts              clean domain types
  input/parse.ts        .ics + attendee-list parsing, company grouping
  parallel/
    schemas.ts          Task API output schemas (the real prompts)
    client.ts           SDK wrapper → Researched<T> (retry, citation mapping)
  research/
    orchestrator.ts     fan-out + assembly; Researcher interface
    live.ts             LiveResearcher (real Parallel calls)
    mock.ts             MockResearcher (canned fixtures)
    icp.ts              deterministic ICP rubric
  branding/logo.ts      logo URL + accent-colour helpers
  output/
    report.ts           branded HTML report
    slack.ts            Block Kit digest + webhook post
    csv.ts              flat CSV export
samples/                sample invite + committed sample outputs
```

---

## 4. Thanks for reading this far — where this could go next

Genuinely, thank you for reading to the bottom. If this project kept going, here are **four distinct directions** I'd be excited to build — deliberately spread across different Parallel APIs and different points in the GTM lifecycle, so they compound rather than overlap.

### A. Always-on signal monitor → proactive Slack alerts
*Uses Parallel's **Monitor API** (continuous web tracking + webhooks).*
Today the tool is **reactive** — you ask for a brief when a meeting appears. This flips it to **proactive**: register your target accounts once, and Parallel watches for buying signals (new funding, leadership hires, headcount spikes, relevant job posts) and pushes a ranked digest to Slack the moment something moves.
**Value:** catches the *timing* that makes outbound land — you reach out the day the signal fires, not weeks later. It's literally option 2 from the brief, and it pairs perfectly with the briefs: monitor surfaces *who to talk to now*, the brief preps the call.

### B. Zero-touch daily brief (Calendar + CRM integration)
*Adds Google/Outlook Calendar + a CRM write-back (HubSpot/Salesforce).*
Each morning, auto-detect the day's external meetings, generate a brief for each, and drop them in Slack/email — no command, no copy-paste. Write the researched fields and ICP score straight back onto the CRM record.
**Value:** removes the one manual step between "tool" and "habit." This is what turns a useful script into something a rep opens coffee-in-hand every day, and it keeps the CRM enriched as a side effect. Highest adoption lever of the four.

### C. ICP-driven account discovery (turn the scorer into a generator)
*Uses Parallel's **FindAll / Entity Search** APIs.*
Right now the ICP rubric *grades* accounts you already have. Invert it: describe the ideal account in the rubric's own terms ("VC/PE firms, 50–500 staff, hiring revenue roles, EU") and have Parallel **find net-new accounts** that match, pre-scored and ranked.
**Value:** moves upstream from meeting prep into **pipeline generation** — it fills the funnel instead of just servicing it. Reuses the exact scoring logic already built, so the rubric does double duty (qualify *and* prospect).

### D. Close the loop with Granola's own notes (post-meeting flywheel)
*The most Granola-native: consumes Granola's meeting notes/transcript as an input.*
After the call, feed Granola's actual notes back in alongside the pre-meeting research: auto-draft a tailored follow-up, update the account with what was learned (budget, timeline, competitors named), and **re-score the ICP** on real signal rather than web inference.
**Value:** completes the bookend — pre-meeting *and* post-meeting — and creates a **data flywheel**: every meeting sharpens the next brief. It's also the deepest product tie-in, since it's powered by Granola's own output, making the automation stickier the more the customer uses Granola.

---

*Distinctly: **A** changes the trigger (proactive), **B** changes the surface (zero-touch workflow), **C** changes the direction (net-new discovery), **D** changes the timeline (post-meeting + flywheel).*

---

Built as a GTM automation exercise using Parallel.ai as the enrichment/research layer.
