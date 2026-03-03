import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createXai } from "@ai-sdk/xai";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(path.resolve(currentDir, "../.env"));

const openRouterApiKey = process.env.OPENROUTER_API_KEY;
if (!openRouterApiKey) {
  throw new Error("Missing OPENROUTER_API_KEY environment variable.");
}

const xai = createXai({
  apiKey: openRouterApiKey,
  baseURL: "https://openrouter.ai/api/v1",
});

const { text, sources } = await generateText({
  model: xai.responses("x-ai/grok-4.1-fast"),
  prompt: `You are an expert global analyst.

Task:
- Summarize the latest important developments in exactly these 3 sections and in this order:
  1) World News
  2) India News
  3) Mumbai News
- Under each section, output multiple items.
- Every item line must strictly follow this format:
  [topic] -> desc

Quality requirements for each desc:
- 3-5 compact, high-density sentences in a single line.
- Include: what happened, key actors, timeline context, why it matters now, who is affected, and likely near-term impact.
- Prefer concrete details (locations, institutions, numbers, dates when known).
- Be information-rich, specific, and analytical; avoid generic phrasing.
- Output as many or as few item lines as needed per section to preserve depth.

Formatting rules:
- Print section titles exactly as plain lines: World News, India News, Mumbai News.
- Do not add bullets, numbering, markdown, intro, or outro.
- No citations of any kind: no links, no URLs, no source names, no bracketed references.`,
  tools: {
    web_search: xai.tools.webSearch(),
  },
});

console.log(text);
