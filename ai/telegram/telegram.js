import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { fileURLToPath } from "node:url";
import path from "node:path";

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
    return "No telegram text available to summarize.";
  }

  const { text } = await generateText({
    model: openai("gpt-5.2"),
    prompt: `You are a world news editor. Convert raw Telegram messages into concise, topic-wise news items.

Input:
${cleanInput}

Requirements:
- Use only facts present in the input.
- Merge duplicates and repeated alerts.
- Keep uncertain claims labeled as unverified.
- Group output by distinct topics.
- Output plain text only in this repeated format:
Title: <topic headline>
Desc: <concise paragraph for this topic>

Title: <next topic headline>
Desc: <concise paragraph for this topic>

- Do not output any other sections or labels.`,
  });

  return text.trim();
}
