import { generateText, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { itemTool } from "./tools.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(path.resolve(currentDir, "../.env"));

export async function extractItems(data, region) {
  const result = await generateText({
    model: openai("gpt-5.2"),
    tools: {
      itemTool,
    },
    stopWhen: stepCountIs(5),
    prompt: `You are given a list of news items for ${region}.\n\n${data}\n\nSelect up to 10 most important items and call itemTool exactly once with those selected concise headline-style strings.`,
  });

  return result;
}
