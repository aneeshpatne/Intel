import { fileURLToPath } from "node:url";
import path from "node:path";
import { createClient } from "redis";
import { Article } from "./ai.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(path.resolve(currentDir, "../.env"));

function redisValueToString(value) {
  if (value == null) return "[]";
  return typeof value === "string" ? value : value.toString("utf8");
}

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const redis = createClient({ url: redisUrl });

await redis.connect();

const rawSelected = await redis.get("selectedArticles");
const rawSelectedText = redisValueToString(rawSelected);

let selectedArticles = [];
try {
  selectedArticles = JSON.parse(rawSelectedText);
} catch {
  selectedArticles = [];
}

for (const item of selectedArticles) {
  const topic = item?.title || "";
  const initialData = item?.initialData || "";
  if (!topic) continue;

  const result = await Article(topic, initialData);
  console.log(result);
}

if (redis.isOpen) {
  await redis.quit();
}
