import { createClient, REDISEARCH_LANGUAGE } from "redis";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { generateIndiaRiskAssessment } from "./ai-layer.js";
import { computeStabilityIndex } from "./compute_layer.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(path.resolve(currentDir, "../.env"));

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const redis = createClient({ url: redisUrl });
await redis.connect();
let indiaNews = await redis.lRange("newsCollection:India", 0, -1);

export async function getIndiaNewsSummary() {
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

const newsSummary = await getIndiaNewsSummary();
const output = await generateIndiaRiskAssessment(newsSummary, "India");
const computed = computeStabilityIndex(output);
console.log(output.top_risk_factors);
await redis.set("top_risk_factors", JSON.stringify(output.top_risk_factors));
console.log(output.top_stabilizers);
await redis.set("top_stabilizers", JSON.stringify(output.top_stabilizers));
console.log(computed?.stability_score);
await redis.set("stability_score", JSON.stringify(computed?.stability_score));
// console.log({ ...output, computed });
