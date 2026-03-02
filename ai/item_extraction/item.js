import { generateText, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { BreakingNews, itemTool } from "./tools.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(path.resolve(currentDir, "../.env"));

export async function extractItems(data, region) {
  const result = await generateText({
    model: openai("gpt-5.2"),
    tools: {
      itemTool,
      BreakingNews,
    },
    stopWhen: stepCountIs(5),
    prompt: `You are a senior news editor preparing outputs for ${region}.

Input news items:
${data}

Tasks:
1) Select up to 10 highest-priority stories (national impact, urgency, public interest, and cross-source relevance). Exclude duplicates and low-signal items.
2) Rewrite each selected story as a concise, headline-style phrase (clear, factual, no clickbait).
3) Call itemTool exactly once with those selected items.
4) Optionally call breakingNewsTool once only for true "breaking" events.
   Breaking means immediate, time-sensitive developments such as:
   - active military escalation/attack with immediate consequences
   - major terror/security incident
   - sudden government emergency action
   - large casualty/disaster event
   Do NOT use breakingNewsTool for routine policy, analysis, market/trade/logistics or economic-impact-only stories unless there is an immediate public-safety emergency.
   If used, provide up to 2 SEO-friendly headline/search phrases.

Constraints:
- Keep phrasing precise and scannable.
- Prefer present tense where natural.
- Do not invent facts beyond the provided items.`,
  });

  return result;
}
