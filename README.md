# 🥣 Granola Meeting-Prep

**A GTM automation that turns a calendar invite into a branded pre-meeting research brief — powered by [Parallel.ai](https://parallel.ai) web research.**

> **TL;DR** — Point it at a `.ics` invite (or a list of attendees). For every prospect it runs Parallel Task API research on the **company** and each **person**, scores the account against Granola's ICP with a transparent rubric, and produces three outputs: a **branded HTML report** (carrying each prospect's own logo + brand colour), a **CSV** for your CRM, and a **Slack digest**. Runs in **mock mode by default ($0 spend)**; add `--live` for real research. Verified live against Parallel — see [sample output](#sample-output).

---

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

Committed in [`samples/output/`](samples/output):

- **`sample-live-stripe.html`** — real Parallel research on Stripe / Patrick Collison (ICP 95, Strong). Open in a browser.
- **`sample-mock-multi-company.html`** — three-company mock brief (Sequoia, Acme SaaS, McKinsey) showing per-company branding + ranking.
- **`sample-slack-payload.json`** — the Slack Block Kit digest.

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

Built as a GTM automation exercise using Parallel.ai as the enrichment/research layer.
