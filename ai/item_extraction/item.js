import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { z } from "zod";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(path.resolve(currentDir, "../.env"));

const { text } = await generateText({
  model: openai("gpt-5.2"),
  prompt: "this is a test say hi.",
});
