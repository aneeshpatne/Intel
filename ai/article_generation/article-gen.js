import { generateText, stepCountIs } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { ArticleTool, itemTool } from "./tools.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(path.resolve(currentDir, "../.env"));

const apiKey = process.env.OPENAI_API_KEY;

const openai = createOpenAI({ apiKey });

export default async function ArticleGen(items) {
  const result = await generateText({
    model: openai("gpt-5.2"),
    tools: { itemTool, ArticleTool },
    stopWhen: stepCountIs(5),
    prompt: `You are a senior news editor selecting article candidates.

Input news items:
${items}

Tasks:
1) Select up to 3 highest-priority stories that deserve full standalone articles (strong impact, urgency, public interest, and cross-source relevance). Exclude duplicates and low-signal items.
2) For each selected story, provide:
   - title: concise, factual, headline-style phrase.
   - initialData: a compact synthesis of known facts from the input (what happened, who/where, and immediate significance).
3) Call ArticleTool exactly once with the final selected stories.
4) Optionally call itemTool once if you also identify marquee-worthy headline items.

Constraints:
- Keep phrasing precise and scannable.
- Prefer present tense where natural.
- Do not invent facts beyond the provided items.
- Keep stories distinct; avoid near-duplicate angles.`,
  });

  return result;
}
