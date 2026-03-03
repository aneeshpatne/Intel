import { createClient } from "redis";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { generateIndiaRiskAssessment } from "./ai-layer.js";
import { computeStabilityIndex } from "./compute_layer.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(path.resolve(currentDir, "../.env"));

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const redis = createClient({ url: redisUrl });
await redis.connect();

export async function getNewsSummary(region) {
  const regionNews = await redis.lRange(`newsCollection:${region}`, 0, -1);
  return regionNews
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
}

export async function getRecentStabilityScores(region, limit = 5) {
  const rawScores = await redis.lRange(`stability_score:${region}`, -limit, -1);
  return rawScores
    .map((item) => {
      try {
        const asText = typeof item === "string" ? item : item.toString("utf8");
        return Number(JSON.parse(asText));
      } catch {
        return Number.NaN;
      }
    })
    .filter((value) => Number.isFinite(value));
}

async function computeAndStoreRegion(region) {
  const newsSummary = await getNewsSummary(region);
  const recentStabilityScores = await getRecentStabilityScores(region, 5);
  const output = await generateIndiaRiskAssessment(
    newsSummary,
    region,
    recentStabilityScores,
  );
  const computed = computeStabilityIndex(output);
  const stabilitySummary = {
    score: computed?.stability_score,
    top_risk_factors: output?.top_risk_factors ?? [],
    top_stabilizers: output?.top_stabilizers ?? [],
    trend: output?.meta?.trend ?? null,
    alert_color: output?.meta?.alert_color ?? null,
  };

  await redis.set(`stability_summary:${region}`, JSON.stringify(stabilitySummary));
  await redis.rPush(`stability_score:${region}`, JSON.stringify(computed?.stability_score));
  await redis.lTrim(`stability_score:${region}`, -5, -1);

  return { output, computed, stabilitySummary };
}

const world = await computeAndStoreRegion("World");
const india = await computeAndStoreRegion("India");

console.log({
  World: world.stabilitySummary,
  India: india.stabilitySummary,
});

// Backward-compatible keys currently used by existing consumers.
await redis.set("stability_summary", JSON.stringify(world.stabilitySummary));
await redis.rPush("stability_score", JSON.stringify(world.computed?.stability_score));
await redis.lTrim("stability_score", -5, -1);
