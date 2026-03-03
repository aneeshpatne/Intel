import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { z } from "zod";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(path.resolve(currentDir, "../.env"));

const apiKey = process.env.OPENAI_API_KEY;

const openai = createOpenAI({ apiKey });

export default async function ArticleGen(items) {
  const { text } = await generateText({
    model: openai("gpt-5.2"),
    prompt: "Select upto 3 Important topics",
  });
}
