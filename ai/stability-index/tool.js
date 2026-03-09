import { tool } from "ai";
import { createClient } from "redis";
import { z } from "zod";
import { computeStabilityIndex } from "./compute_layer.js";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
let redisClientPromise;

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

function getRedisClient() {
  if (!redisClientPromise) {
    const client = createClient({ url: redisUrl });
    redisClientPromise = client.connect().then(() => client);
  }

  return redisClientPromise;
}

export const StabilityAssessmentTool = tool({
  description:
    "Save a structured stability assessment for a region and compute the stability summary.",
  inputSchema: z.object({
    region: z
      .string()
      .describe("Region name to process, for example World or India."),
    assessment: assessmentSchema,
  }),
  execute: async ({ region, assessment }) => {
    console.log(`Stability Tool Invoked for ${region}`);
    const redis = await getRedisClient();
    const computed = computeStabilityIndex(assessment);
    const stabilitySummary = {
      score: computed?.stability_score,
      top_risk_factors: assessment?.top_risk_factors ?? [],
      top_stabilizers: assessment?.top_stabilizers ?? [],
      trend: assessment?.meta?.trend ?? null,
      alert_color: assessment?.meta?.alert_color ?? null,
    };
    console.log(stabilitySummary);
    await redis.set(
      `stability_assessment:${region}`,
      JSON.stringify(assessment),
    );
    await redis.set(
      `stability_summary:${region}`,
      JSON.stringify(stabilitySummary),
    );
    await redis.rPush(
      `stability_score:${region}`,
      JSON.stringify(computed?.stability_score),
    );
    await redis.lTrim(`stability_score:${region}`, -5, -1);

    return { region, assessment, computed, stabilitySummary };
  },
});
