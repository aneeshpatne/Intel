import "dotenv/config";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { createClient } from "redis";

const apiId = Number(process.env.TG_API_ID);
const apiHash = process.env.TG_API_HASH;
const sessionString = process.env.TG_SESSION_STRING || "";
const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const redisKey = process.env.TG_REDIS_KEY || "telegram:dedup:latest20";
const redisNewKey = process.env.TG_REDIS_NEW_KEY || "telegram:new:latest20";
const suppressTimeoutLogs =
  (process.env.TG_SUPPRESS_TIMEOUT_LOGS || "1") !== "0";
const latestMessagesLimit = 20;
const newMessagesLimit = 20;
const fetchMessagesLimit = 200;
const historyMessagesLimit = 500;
import { defaultChannels } from "./default-channels.js";

if (!apiId || !apiHash || !sessionString) {
  throw new Error("Set TG_API_ID, TG_API_HASH and TG_SESSION_STRING env vars.");
}

function redisValueToString(value) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toString" in value)
    return value.toString();
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
    console.warn(
      `[telegram/channel] ${label} warning:`,
      error?.message || error,
    );
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function mergeUniqueMessages(
  primary = [],
  secondary = [],
  limit = historyMessagesLimit,
) {
  const merged = [];
  const seen = new Set();

  for (const message of [...primary, ...secondary]) {
    const text = typeof message === "string" ? message.trim() : "";
    if (!text || seen.has(text)) continue;
    seen.add(text);
    merged.push(text);
    if (merged.length >= limit) break;
  }

  return merged;
}

async function collectLatestTextMessages(
  client,
  channelRef,
  fetchLimit = fetchMessagesLimit,
  resultLimit = latestMessagesLimit,
) {
  const entity = await client.getEntity(channelRef);
  const messages = await client.getMessages(entity, { limit: fetchLimit });
  const dedup = new Set();
  const latest = [];

  for (const msg of messages) {
    const text = (msg.message || "").trim();
    if (!text || dedup.has(text)) continue;
    dedup.add(text);
    latest.push(text);
    if (latest.length >= resultLimit) break;
  }

  return latest;
}

function resolveChannels(channelInputs = []) {
  return channelInputs.length > 0
    ? channelInputs
    : process.env.TG_CHANNEL_LINKS
      ? process.env.TG_CHANNEL_LINKS.split(",")
          .map((v) => v.trim())
          .filter(Boolean)
      : defaultChannels;
}

export async function syncTelegramChannels(channelInputs = []) {
  const channels = resolveChannels(channelInputs);
  const tgClient = new TelegramClient(
    new StringSession(sessionString),
    apiId,
    apiHash,
    {
      connectionRetries: 5,
    },
  );

  if (suppressTimeoutLogs) {
    tgClient.setLogLevel("none");
    tgClient.onError = async (error) => {
      if (error?.message === "TIMEOUT") return;
      console.error("[telegram/channel] telegram client error:", error);
    };
  }

  const redis = createClient({ url: redisUrl });

  try {
    await tgClient.connect();
    await redis.connect();

    const channelsData = [];
    const previousRaw = await redis.get(redisKey);
    const previousStoreRaw = redisValueToString(previousRaw);
    const previousStore = previousStoreRaw
      ? JSON.parse(previousStoreRaw)
      : null;
    const previousByChannel = new Map(
      (previousStore?.channels || []).map((entry) => [
        entry.name,
        {
          messages: Array.isArray(entry.messages) ? entry.messages : [],
          seenMessages: Array.isArray(entry.seenMessages)
            ? entry.seenMessages
            : Array.isArray(entry.messages)
              ? entry.messages
              : [],
        },
      ]),
    );

    for (const rawChannel of channels) {
      const channelName = rawChannel.trim();
      if (!channelName) continue;

      const items = await collectLatestTextMessages(
        tgClient,
        channelName,
        fetchMessagesLimit,
        latestMessagesLimit,
      );
      const previousEntry = previousByChannel.get(channelName);
      const seenMessages = previousEntry?.seenMessages || [];
      const seenSet = new Set(seenMessages);
      const newMessages = items
        .filter((message) => !seenSet.has(message))
        .slice(0, newMessagesLimit);

      channelsData.push({
        name: channelName,
        messages: items,
        seenMessages: mergeUniqueMessages(items, seenMessages),
        newMessages,
      });
      console.log(`Collected ${items.length} messages from: ${channelName}`);
    }

    const store = {
      updatedAt: new Date().toISOString(),
      channels: channelsData,
    };

    const newOnlyStore = {
      updatedAt: new Date().toISOString(),
      channels: channelsData.map((entry) => {
        return {
          name: entry.name,
          messages: entry.newMessages,
        };
      }),
    };

    await redis.set(redisKey, JSON.stringify(store));
    await redis.set(redisNewKey, JSON.stringify(newOnlyStore));
    console.log(`Saved channels to Redis key: ${redisKey}`);
    console.log(`Saved channels to Redis key: ${redisNewKey}`);
  } finally {
    if (redis.isOpen) {
      await closeWithTimeout(() => redis.quit(), "redis quit");
    }
    await closeWithTimeout(() => tgClient.destroy(), "telegram destroy");
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await syncTelegramChannels(process.argv.slice(2));
}
