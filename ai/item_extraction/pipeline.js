import { createClient } from "redis";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { extractItems } from "./item.js";

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

export async function runItemExtraction(data, region) {
  return extractItems(data, region);
}

const region = "India";
const data = await getNewsSummary(region);
await runItemExtraction(data, region);
