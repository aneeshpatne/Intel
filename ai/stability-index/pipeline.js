import { createClient } from "redis";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { generateIndiaRiskAssessment } from "./ai-layer.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(path.resolve(currentDir, "../.env"));

export async function getIndiaNewsSummary() {
  const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
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
const output = await generateIndiaRiskAssessment(newsSummary);
console.log(output);
