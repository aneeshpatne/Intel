import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { fileURLToPath } from "node:url";
import path from "node:path";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(path.resolve(currentDir, "../.env"));

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error("OPENAI_API_KEY is missing in ../.env");
}

const openai = createOpenAI({ apiKey });

const { text } = await generateText({
  model: openai("gpt-5.2-codex"),
  prompt: "Invent a new holiday and describe its traditions.",
});

console.log(text);
