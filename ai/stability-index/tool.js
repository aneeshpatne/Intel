import { tool } from "ai";
import { createClient } from "redis";
import { z } from "zod";

let redisClientPromise;

function getRedisClient() {
  if (!redisClientPromise) {
    const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
    const client = createClient({ url: redisUrl });
    redisClientPromise = client.connect().then(() => client);
  }

  return redisClientPromise;
}

const assessmentSchema = z.object({
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
  top_risk_factors: z
    .array(
      z
        .string()
        .describe("Concise headline-style phrase, ideally <= 95 characters"),
    )
    .max(8),
  stabilizers: z.object({
    deescalation_peace_process: z.number().min(0).max(1),
    governance_effectiveness: z.number().min(0).max(1),
    economic_relief_positive: z.number().min(0).max(1),
    services_restored: z.number().min(0).max(1),
  }),
  top_stabilizers: z
    .array(
      z
        .string()
        .describe("Concise headline-style phrase, ideally <= 95 characters"),
    )
    .max(8),
  exposure: z.object({
    domestic: z.number().min(0).max(1),
    external_spillover: z.number().min(0).max(1),
  }),
  meta: z.object({
    intensity_overall: z.number().min(0).max(1),
    uncertainty: z.number().min(0).max(1),
    confidence: z.number().min(0).max(1),
    trend: z.string().describe("1 word only"),
    alert_color: z.string().describe("Red, orange, yellow or Green."),
  }),
});

export const StabilityAssessmentTool = tool({
  description:
    "Save a structured stability assessment for a region using the stability-index schema.",
  inputSchema: z.object({
    region: z.string().describe("Region or country name, for example India."),
    assessment: assessmentSchema,
  }),
  execute: async ({ region, assessment }) => {
    const redis = await getRedisClient();
    const payload = {
      region,
      assessment,
      createdAt: new Date().toISOString(),
    };

    await redis.set(`stability_assessment:${region}`, JSON.stringify(payload));
    return payload;
  },
});
