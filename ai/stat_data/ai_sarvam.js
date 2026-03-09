import { generateText, stepCountIs } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { MarqueeItems } from "./tool_data.js";
import { CoordinateTool } from "./tool_coordinate.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(path.resolve(currentDir, "../.env"));

const apiKey = process.env.SARVAM_KEY;
if (!apiKey) {
  throw new Error("Missing SARVAM_KEY environment variable.");
}

const sarvam = createOpenAI({
  baseURL: "https://api.sarvam.ai/v1",
  apiKey,
});

export default async function DataGenSarvam(items) {
  const { text } = await generateText({
    model: sarvam.chat("sarvam-30b"),
    stopWhen: stepCountIs(4),
    prompt: `You are a news-to-UI data extraction agent.

You will receive one plain-text digest built from Redis key newsCollection.
The digest format is a repeated sequence like:
Title: ...
Description: ...

Your job is to extract two kinds of output:
1. Short marquee headlines for the site's scrolling news strip.
2. Geolocated event markers for the map.

Input digest:
${items || "No items provided."}

Workflow:
1. Read the full digest first and treat each Title/Description pair as one news item.
2. Identify the strongest, most relevant developments.
2. Call MarqueeItems exactly once with an array named marquee.
3. Call CoordinateTool exactly once with 3 arrays: conflict, concern, weather.
4. After tool calls, return a short plain-text summary of what was saved.

Rules for MarqueeItems:
- Save 4 to 12 items when enough signal exists.
- Each marquee string must be short, sharp, and under 60 characters.
- Use headline style, not full sentences.
- Do not include duplicates or near-duplicates.
- Prefer current, high-signal developments over low-value background.

Rules for CoordinateTool:
- Add a point only when the digest provides a clear real-world location or one can be inferred with high confidence from a well-known place.
- Put armed clashes, strikes, attacks, troop activity, or battlefield developments in conflict.
- Put political instability, protests, sanctions, diplomatic risk, economic stress, or security concern in concern.
- Put storms, floods, earthquakes, heatwaves, fires, or other climate/weather events in weather.
- Each point must include latitude, longitude, and desc.
- desc must be factual, specific, and <= 50 characters.
- Do not invent coordinates for vague locations.
- If a category has no reliable points, pass an empty array for it.

General constraints:
- Use only the provided digest content.
- Do not fabricate facts, places, dates, or coordinates.
- Keep outputs compact and high-signal.
- Avoid commentary outside the requested tool calls and final short summary.`,
    tools: { MarqueeItems, CoordinateTool },
  });

  return text;
}
