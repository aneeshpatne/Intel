import { generateText, Output } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createClient } from "redis";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { z } from "zod";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(path.resolve(currentDir, "../.env"));

const apiKey = process.env.OPENAI_API_KEY;
const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

const openai = createOpenAI({ apiKey });
const redis = createClient({ url: redisUrl });

let indiaNews = [];
try {
  await redis.connect();
  indiaNews = await redis.lRange("newsCollection:India", 0, -1);
} finally {
  if (redis.isOpen) {
    await redis.close();
  }
}

const newsSummary = indiaNews
  .map((item) => {
    try {
      const asText = typeof item === "string" ? item : item.toString("utf8");
      const parsed = JSON.parse(asText);
      const title = parsed?.title ?? "";
      const description = parsed?.description ?? "";
      return `Title: ${title}\nDescription: ${description}`;
    } catch {
      return "";
    }
  })
  .filter(Boolean)
  .join("\n\n");

const prompt = `You are a geopolitical risk analyst for India.
Use the news items below to estimate current national risk levels.

Requirements:
- Return one score for each risk field on a 0 to 1 scale.
- 0 means no meaningful risk signal in the input.
- 1 means severe and widespread risk signal in the input.
- Base scores only on the provided items, with stronger weight on recurring themes and high-impact events.
- If evidence is mixed or limited, keep values moderate instead of extreme.

News feed:
${newsSummary}`;

const { output } = await generateText({
  model: openai("gpt-5-nano"),
  prompt,
  output: Output.object({
    schema: z.object({
      risk: z.object({
        armed_conflict_intensity: z.number().min(0).max(1),
        civilian_harm: z.number().min(0).max(1),
        government_stability: z.number().min(0).max(1),
        institutional_trust_legitimacy: z.number().min(0).max(1),
        protest_unrest_intensity: z.number().min(0).max(1),
        economic_financial_instability: z.number().min(0).max(1),
        inflation_cost_of_living_stress: z.number().min(0).max(1),
        critical_infra_outages: z.number().min(0).max(1),
        disaster_climate_impact: z.number().min(0).max(1),
        sanctions_trade_constraints: z.number().min(0).max(1),
        diplomatic_tension: z.number().min(0).max(1),
      }),
    }),
  }),
});

console.log(output);
