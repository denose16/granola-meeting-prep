/**
 * CLI entry point.
 *
 *   npm run brief -- --input samples/sample-meeting.ics
 *   npm run brief -- --attendees "Jane Okafor <jane@acme-saas.com>" --title "Acme intro"
 *   npm run brief -- --input samples/sample-meeting.ics --live --processor core
 *
 * Defaults to MOCK mode (zero Parallel spend). Add --live to make real calls.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { assertApiKey, config } from "./config.js";
import { parseAttendeeList, parseInputFile } from "./input/parse.js";
import { buildBrief } from "./research/orchestrator.js";
import { LiveResearcher } from "./research/live.js";
import { MockResearcher } from "./research/mock.js";
import { renderReport } from "./output/report.js";
import { renderCsv } from "./output/csv.js";
import { buildSlackPayload, postToSlack } from "./output/slack.js";
import type { Meeting } from "./types.js";

interface Args {
  input?: string;
  attendees?: string;
  title?: string;
  processor: string;
  live: boolean;
  out: string;
  help: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { processor: config.defaultProcessor, live: false, out: "out", help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "--input": args.input = argv[++i]; break;
      case "--attendees": args.attendees = argv[++i]; break;
      case "--title": args.title = argv[++i]; break;
      case "--processor": args.processor = argv[++i] ?? args.processor; break;
      case "--out": args.out = argv[++i] ?? args.out; break;
      case "--live": args.live = true; break;
      case "-h": case "--help": args.help = true; break;
    }
  }
  return args;
}

const HELP = `
Granola Meeting-Prep — turn a calendar invite into a branded pre-meeting brief.

Usage:
  npm run brief -- --input <file.ics|file.txt>     Parse a calendar invite or attendee list
  npm run brief -- --attendees "<list>"            Comma/newline-separated attendees
  npm run brief -- --title "<title>"               Override the meeting title

Options:
  --live                 Make real Parallel.ai calls (default: mock, $0 spend)
  --processor <tier>     lite | base | core | pro | ultra  (default: ${config.defaultProcessor})
  --out <dir>            Output directory (default: out)
  -h, --help             Show this help

Output: branded HTML report + CSV in <out>/, and a Slack digest (posted if
SLACK_WEBHOOK_URL is set, otherwise written to <out>/slack-payload.json).
`;

function loadMeeting(args: Args): Meeting {
  if (args.input) {
    const m = parseInputFile(args.input);
    if (args.title) m.title = args.title;
    return m;
  }
  if (args.attendees) return parseAttendeeList(args.attendees, args.title ?? "Prospect meeting");
  throw new Error("Provide --input <file> or --attendees \"<list>\". Use --help for usage.");
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "brief";
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { console.log(HELP); return; }

  const meeting = loadMeeting(args);
  const prospects = meeting.attendees.filter((a) => !a.isInternal);
  console.log(`\n🥣 Meeting: "${meeting.title}" — ${prospects.length} prospect attendee(s)`);

  const researcher = args.live
    ? new LiveResearcher(assertApiKey(), args.processor)
    : new MockResearcher();
  console.log(args.live ? `🌐 LIVE mode — Parallel processor: ${args.processor}` : "🧪 MOCK mode — no API spend (add --live for real research)");

  console.log("🔎 Researching…");
  const brief = await buildBrief(meeting, researcher);

  // Write outputs.
  mkdirSync(args.out, { recursive: true });
  const base = slug(meeting.title);
  const htmlPath = join(args.out, `${base}.html`);
  const csvPath = join(args.out, `${base}.csv`);
  writeFileSync(htmlPath, renderReport(brief), "utf8");
  writeFileSync(csvPath, renderCsv(brief), "utf8");

  // Slack digest.
  const payload = buildSlackPayload(brief, htmlPath);
  if (config.slackWebhookUrl) {
    await postToSlack(payload, config.slackWebhookUrl);
    console.log("💬 Posted digest to Slack.");
  } else {
    const slackPath = join(args.out, "slack-payload.json");
    writeFileSync(slackPath, JSON.stringify(payload, null, 2), "utf8");
    console.log(`💬 No SLACK_WEBHOOK_URL set — digest written to ${slackPath}`);
  }

  // Console summary.
  console.log("\n📊 ICP ranking:");
  for (const p of brief.prospects) {
    console.log(`   ${p.icp.score.toString().padStart(3)}  ${p.icp.tier.padEnd(8)} ${p.company.value.legal_name}`);
  }
  console.log(`\n✅ Report:  ${htmlPath}\n✅ CSV:     ${csvPath}\n`);
}

main().catch((err) => {
  console.error("\n❌ " + (err instanceof Error ? err.message : String(err)));
  process.exit(1);
});
