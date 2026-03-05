import { createClient } from "redis";
import { fileURLToPath, pathToFileURL } from "node:url";
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

async function closeWithTimeout(task, label, timeoutMs = 8000) {
  let timer;
  try {
    await Promise.race([
      task(),
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} timed out after ${timeoutMs}ms`)),
          timeoutMs,
        );
      }),
    ]);
  } catch (error) {
    console.warn(`[telegram/pipeline] ${label} warning:`, error?.message || error);
  } finally {
    if (timer) clearTimeout(timer);
  }
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

export async function runTelegramPipeline() {
  const redis = createClient({ url: redisUrl });

  try {
    await syncTelegramChannels();
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
  } finally {
    if (redis.isOpen) {
      await closeWithTimeout(() => redis.quit(), "redis quit");
    }
  }
}

const isMain =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  runTelegramPipeline()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
