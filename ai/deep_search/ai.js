import { generateText, stepCountIs } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { SaveArticle, WebSearchTool } from "./tools.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(path.resolve(currentDir, "../.env"));

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error("Missing OPENAI_API_KEY environment variable.");
}

const openai = createOpenAI({ apiKey });

export async function Article(topic, initialData = "") {
  const { text } = await generateText({
    model: openai("gpt-5-mini"),
    stopWhen: stepCountIs(8),
    tools: { WebSearchTool, SaveArticle },
    prompt: `You are a senior world-news writer.

Topic:
${topic}

Initial notes (may be partial):
${initialData || "None"}

Workflow:
1) Start with one broad WebSearchTool query for the topic.
2) Extract missing details (timeline, actors, geography, impact, latest updates).
3) Call WebSearchTool again with focused follow-up queries to fill those gaps.
4) You may call WebSearchTool at most 2 times total.
5) After the second search (or earlier if enough data), stop searching and write using available material.
6) Use only the accumulated tool output + initial notes as source material.
7) Write one polished markdown article with:
   - single-line impactful title
   - brief context
   - key developments
   - why it matters / what to watch
8) Call SaveArticle exactly once with:
   - title
   - newsContent

Constraints:
- Use only information present in the provided notes and tool output.
- No fabricated facts, dates, or numbers.
- Use WebSearchTool no more than 2 times in total.
- For every WebSearchTool call, write the query exactly like a Google search box input: short keyword phrase only, no long sentence.
- Keep each searchTerm compact (about 6-20 words), high-signal keywords only.
- Keep the article concise and high-signal.
- Title must be a single line and impactful.
- Keep content in markdown paragraph format only.
- Do not use bold, italics, tables, bullet lists, or numbered lists.`,
  });

  return text;
}
