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
  await DataGen(items);
} catch (error) {
  exitCode = 1;
  console.error(error);
} finally {
  if (redis.isOpen) await redis.quit();
  process.exit(exitCode);
}
