import { generateText, stepCountIs } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { SaveTool } from "./tools.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(path.resolve(currentDir, "../.env"));

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error("Missing OPENAI_API_KEY environment variable.");
}

const openai = createOpenAI({ apiKey });

export async function TelegramSummary(inputText) {
  const cleanInput = (inputText || "").trim();
  if (!cleanInput) {
    return;
  }

  await generateText({
    model: openai("gpt-5-mini"),
    tools: { SaveTool },
    stopWhen: stepCountIs(3),
    prompt: `You are a world news editor. Extract clear, non-duplicate news items from raw Telegram messages.

Input:
${cleanInput}

Requirements:
- Use only facts present in the input.
- Merge duplicates and repeated alerts.
- Do not add verification labels or qualifiers such as "unverified", "verified", "alleged", or similar tags.
- Group by distinct topics/events and keep one item per event.
- Prefer concrete entities, places, numbers, and timing when present.
- Remove chatter, opinions, jokes, and non-news text.
- Write direct factual statements; do not use phrases like "this message", "this report", "the post says", or similar meta wording.
- Call SaveTool exactly once with:
  newsItem: [
    {
      title: "impactful headline under 50 chars",
      description: "detailed, information-rich paragraph with key context and implications",
      short_description: "compact summary under 100 chars, must be short."
    }
  ]
- Include all important distinct topics in the array.
- Make description detailed and information-rich; include key actors, what happened, where, and why it matters when available.
- Ensure title length is < 50 chars.
- Ensure short_description length is < 150 chars.
- Do not return final text. Only make the tool call.`,
  });
}
