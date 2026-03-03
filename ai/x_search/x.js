import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(filePath = ".env") {
  const fullPath = resolve(process.cwd(), filePath);
  let content = "";
  try {
    content = readFileSync(fullPath, "utf8");
  } catch {
    return;
  }

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIdx = trimmed.indexOf("=");
    if (eqIdx <= 0) continue;

    const key = trimmed.slice(0, eqIdx).trim();
    if (process.env[key] !== undefined) continue;

    let value = trimmed.slice(eqIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

if (!process.env.OPENROUTER_API_KEY) {
  loadEnvFile(".env");
}

const openRouterApiKey = process.env.OPENROUTER_API_KEY;
if (!openRouterApiKey) {
  throw new Error("Missing OPENROUTER_API_KEY environment variable.");
}

const openrouter = createOpenRouter({
  apiKey: openRouterApiKey,
});

const { text } = await generateText({
  model: openrouter("grok-4"),
  prompt: "Write a vegetarian lasagna recipe for 4 people.",
});

console.log(text);
