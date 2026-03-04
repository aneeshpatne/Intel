import { createClient } from "redis";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { TelegramSummary } from "./telegram.js";
import { syncTelegramChannels } from "./channel.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(path.resolve(currentDir, "../.env"));

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const redisKey = process.env.TG_REDIS_KEY || "telegram:dedup:latest20";
const redisNewKey = process.env.TG_REDIS_NEW_KEY || "telegram:new:latest20";

function redisValueToString(value) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toString" in value) return value.toString();
  return null;
}

function extractOnlyText(store) {
  const channels = Array.isArray(store?.channels) ? store.channels : [];
  return channels
    .flatMap((channel) => (Array.isArray(channel?.messages) ? channel.messages : []))
    .filter((msg) => typeof msg === "string")
    .map((msg) => msg.trim())
    .filter(Boolean)
    .join("\n\n");
}

const redis = createClient({ url: redisUrl });
let exitCode = 0;

try {
  await syncTelegramChannels(process.argv.slice(2));
  await redis.connect();

  const newRaw = await redis.get(redisNewKey);
  const dedupRaw = await redis.get(redisKey);

  const newStoreRaw = redisValueToString(newRaw);
  const dedupStoreRaw = redisValueToString(dedupRaw);

  const newStore = newStoreRaw ? JSON.parse(newStoreRaw) : null;
  const dedupStore = dedupStoreRaw ? JSON.parse(dedupStoreRaw) : null;

  const newText = extractOnlyText(newStore);
  const dedupText = extractOnlyText(dedupStore);
  const inputText = newText || dedupText;

  await TelegramSummary(inputText);
} catch (error) {
  exitCode = 1;
  console.error(error);
} finally {
  if (redis.isOpen) await redis.quit();
  process.exit(exitCode);
}
