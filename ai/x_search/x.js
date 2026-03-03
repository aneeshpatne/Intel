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
- Summarize the latest important world news developments.
- Each line must strictly follow this format:
  [topic] -> desc

Quality requirements for each desc:
- 2-3 compact sentences in a single line.
- Include: what happened, key actors, why it matters now, and likely near-term impact.
- Prefer concrete details (country/region, numbers, dates when known).
- Output as many or as few lines as needed to stay information-rich.
- No intro, no outro, no bullets, no markdown, no numbering.
- Do not output anything except correctly formatted lines.`,
  tools: {
    web_search: xai.tools.webSearch(),
  },
});

console.log(text);
