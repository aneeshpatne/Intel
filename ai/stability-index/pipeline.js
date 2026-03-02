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
  let indiaNews = await redis.lRange(`newsCollection:${region}`, 0, -1);
  return indiaNews
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

export async function getRecentStabilityScores(limit = 5) {
  const rawScores = await redis.lRange("stability_score", -limit, -1);
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

const newsSummary = await getNewsSummary("World");
const recentStabilityScores = await getRecentStabilityScores(5);
const output = await generateIndiaRiskAssessment(
  newsSummary,
  "World",
  recentStabilityScores,
);
const computed = computeStabilityIndex(output);
console.log(output.top_risk_factors);
await redis.set("top_risk_factors", JSON.stringify(output.top_risk_factors));
console.log(output.top_stabilizers);
await redis.set("top_stabilizers", JSON.stringify(output.top_stabilizers));
console.log(computed?.stability_score);
await redis.rPush("stability_score", JSON.stringify(computed?.stability_score));
await redis.lTrim("stability_score", -5, -1);
// console.log({ ...output, computed });
