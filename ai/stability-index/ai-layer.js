import { generateText, Output } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { z } from "zod";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(path.resolve(currentDir, "../.env"));

const apiKey = process.env.OPENAI_API_KEY;

const openai = createOpenAI({ apiKey });

const { output } = await generateText({
  model: openai("gpt-5-nano"),
  prompt: "its a test make object with dummy values.",
  output: Output.object({
    schema: z.object({
      status: z.object({
        stability: z.string().describe("The Stability Factor"),
        instability: z.string().describe("The instability Factor"),
      }),
    }),
  }),
});

console.log(output);
