import { createClient } from "redis";
import { fileURLToPath } from "node:url";
import path from "node:path";
import DataGen from "./ai.js";
import DataGenSarvam from "./ai_sarvam.js";
const currentDir = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(path.resolve(currentDir, "../.env"));

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const redis = createClient({ url: redisUrl });
let exitCode = 0;

export async function getNewsSummary() {
  const MarqueeItems = (await redis.lRange("marqueeItems", 0, -1)).join("\n");

  const news = await redis.lRange(`newsCollection`, 0, -1);
  return news
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

try {
  await redis.connect();
  const items = await getNewsSummary();
  const selectedArticle = await redis.lRange("selectedArticles:list", 0, -1);
  const selectedArticles = selectedArticle.join("\n");
  const data = await redis.lRange("marqueeItems", 0, -1);
  const marqueeData = data.join("\n");

  const keys = [];
  for await (const batch of redis.scanIterator({ MATCH: "coordinates:*" })) {
    keys.push(...batch);
  }

  let result = await Promise.all(
    keys.map(async (key) => {
      return await redis.lRange(key, 0, -1);
    }),
  );

  const CoordinatesData = result
    .flat()
    .map((item) => {
      const asText = typeof item === "string" ? item : item.toString("utf8");
      return JSON.parse(asText)[2];
    })
    .join("\n");
  await DataGen(items, marqueeData, CoordinatesData, selectedArticles);
} catch (error) {
  exitCode = 1;
  console.error(error);
} finally {
  if (redis.isOpen) await redis.quit();
  process.exit(exitCode);
}
