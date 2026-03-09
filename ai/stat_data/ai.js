import { generateText, stepCountIs } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { MarqueeItems } from "./tool_data.js";
import { CoordinateTool } from "./tool_coordinate.js";
import { StabilityAssessmentTool } from "../stability-index/tool.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(path.resolve(currentDir, "../.env"));

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("Missing GEMINI_API_KEY environment variable.");
}

const google = createGoogleGenerativeAI({ apiKey });

export default async function DataGen(items) {
  const { text } = await generateText({
    model: google("gemini-3.1-flash-lite-preview"),
    stopWhen: stepCountIs(8),
    prompt: `You are a news-to-UI data extraction agent.

You will receive one plain-text digest built from Redis key newsCollection.
The digest format is a repeated sequence like:
Title: ...
Description: ...

Your job is to extract four kinds of output:
1. Short marquee headlines for the site's scrolling news strip.
2. Geolocated event markers for the map.
3. A stored stability assessment for the World region.
4. A stored stability assessment for the India region.

Input digest:
${items || "No items provided."}

Workflow:
1. Read the full digest first and treat each Title/Description pair as one news item.
2. Identify the strongest, most relevant developments.
3. Call MarqueeItems exactly once with an array named marquee.
4. Call CoordinateTool exactly once with 3 arrays: conflict, concern, weather.
5. Call StabilityAssessmentTool once with:
   - region: "World"
6. Call StabilityAssessmentTool a second time with:
   - region: "India"
7. After all tool calls, return a short plain-text summary of what was saved.

Hard requirement:
- This task is incomplete unless MarqueeItems is called once, CoordinateTool is called once, and StabilityAssessmentTool is called twice.
- If there is weak signal, still call all tools and use conservative, moderate scores.
- Do not end your response until MarqueeItems, CoordinateTool, and both StabilityAssessmentTool calls have completed.

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

Rules for StabilityAssessmentTool:
- Call StabilityAssessmentTool exactly twice in this run: first for World, second for India.
- Base the assessment only on the provided digest.
- All numeric scores must be between 0 and 1.
- Use stronger scores only when the digest shows repeated or high-impact evidence.
- If evidence is mixed or limited, keep values moderate.
- top_risk_factors and top_stabilizers must be concise headline-style phrases.
- trend must be one word only.
- alert_color must be one of: Red, orange, yellow, Green.
- Pass the full structured assessment object with each call.
- For the India call, use region "India". For the global call, use region "World".
- Use this exact assessment shape:
  {
    risk: {
      armed_conflict_intensity,
      civilian_harm,
      government_stability,
      institutional_trust_legitimacy,
      protest_unrest_intensity,
      economic_financial_instability,
      inflation_cost_of_living_stress,
      critical_infra_outages,
      disaster_climate_impact,
      sanctions_trade_constraints,
      diplomatic_tension
    },
    top_risk_factors: [],
    stabilizers: {
      deescalation_peace_process,
      governance_effectiveness,
      economic_relief_positive,
      services_restored
    },
    top_stabilizers: [],
    exposure: {
      domestic,
      external_spillover
    },
    meta: {
      intensity_overall,
      uncertainty,
      confidence,
      trend,
      alert_color
    }
  }

General constraints:
- Use only the provided digest content.
- Do not fabricate facts, places, dates, or coordinates.
- Keep outputs compact and high-signal.
- Avoid commentary outside the requested tool calls and final short summary.`,
    tools: { MarqueeItems, CoordinateTool, StabilityAssessmentTool },
  });

  return text;
}
