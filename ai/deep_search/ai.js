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
    model: openai("gpt-5.2"),
    stopWhen: stepCountIs(4),
    tools: { WebSearchTool, SaveArticle },
    prompt: `You are a senior world-news writer.

Topic:
${topic}

Initial notes (may be partial):
${initialData || "None"}

Workflow:
1) Call WebSearchTool as many times as needed with concise search terms focused on the topic.
2) Use the returned text as source material.
3) Write one polished markdown article with:
   - single-line impactful title
   - brief context
   - key developments
   - why it matters / what to watch
4) Call SaveArticle exactly once with:
   - title
   - newsContent

Constraints:
- Use only information present in the provided notes and tool output.
- No fabricated facts, dates, or numbers.
- Keep the article concise and high-signal.
- Title must be a single line and impactful.
- Keep content in markdown paragraph format only.
- Do not use bold, italics, tables, bullet lists, or numbered lists.`,
  });

  return text;
}
