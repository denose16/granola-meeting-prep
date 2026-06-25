/**
 * Slack output — builds a Block Kit digest of the meeting brief and posts it to
 * an Incoming Webhook. If no webhook is configured, the payload is written to
 * ./out/slack-payload.json and a text preview is printed (demo never breaks).
 */
import type { MeetingBrief } from "../types.js";

const TIER_EMOJI = { Strong: "🟢", Moderate: "🟡", Weak: "🔴" } as const;

export interface SlackBlock {
  type: string;
  [key: string]: unknown;
}

export function buildSlackPayload(brief: MeetingBrief, reportPath?: string): { blocks: SlackBlock[]; text: string } {
  const blocks: SlackBlock[] = [];

  blocks.push({
    type: "header",
    text: { type: "plain_text", text: `🥣 Pre-meeting brief: ${brief.meeting.title}`.slice(0, 150), emoji: true },
  });

  const modeNote = brief.live ? "Live research via Parallel.ai" : "Mock data (run with --live for real research)";
  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `${brief.prospects.length} company(ies) · ${brief.meeting.startsAt ?? "time TBD"} · ${modeNote}`,
      },
    ],
  });
  blocks.push({ type: "divider" });

  for (const p of brief.prospects) {
    const c = p.company.value;
    const emoji = TIER_EMOJI[p.icp.tier];
    const people = p.people
      .map((person) => `• *${person.value.full_name}* — ${person.value.current_title}`)
      .join("\n");
    const lead = p.people[0]?.value.talking_points?.split(/\d\)/).filter(Boolean)[0]?.trim();

    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: [
          `${emoji} *${c.legal_name}*  —  ICP *${p.icp.score}/100* (${p.icp.tier})`,
          `_${c.one_liner}_`,
          `*Signals:* ${c.recent_signals}`,
          people,
          lead ? `*Opener:* ${lead}` : "",
        ]
          .filter(Boolean)
          .join("\n")
          .slice(0, 2900),
      },
    });
    blocks.push({ type: "divider" });
  }

  if (reportPath) {
    blocks.push({
      type: "context",
      elements: [{ type: "mrkdwn", text: `📄 Full branded report: \`${reportPath}\`` }],
    });
  }

  const text = `Pre-meeting brief: ${brief.meeting.title} — ${brief.prospects.length} company(ies)`;
  return { blocks, text };
}

export async function postToSlack(
  payload: { blocks: SlackBlock[]; text: string },
  webhookUrl: string,
): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Slack webhook returned ${res.status}: ${await res.text()}`);
  }
}
