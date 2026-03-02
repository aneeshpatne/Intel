import { tool } from "ai";
import { createClient } from "redis";
import { z } from "zod";

let redisClientPromise;

function getRedisClient() {
  if (!redisClientPromise) {
    const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
    const client = createClient({ url: redisUrl });
    redisClientPromise = client.connect().then(() => client);
  }

  return redisClientPromise;
}

export const breakingNewsTool = tool({
  description:
    "Optionally select up to 2 urgent, high-impact breaking stories that deserve a dedicated breaking-news slot.",
  inputSchema: z.object({
    headLines: z
      .array(
        z
          .string()
          .describe(
            "SEO-friendly breaking-news headline/search phrase, concise and specific.",
          ),
      )
      .max(2),
  }),
  execute: async ({ headLines }) => {
    const redis = await getRedisClient();
    await redis.set("headLines", JSON.stringify(headLines));
    console.log(headLines);
    return { headLines };
  },
});

export const BreakingNews = breakingNewsTool;

export const itemTool = tool({
  description:
    "Select up to 10 most important stories for the primary marquee/news feed.",
  inputSchema: z.object({
    newsItems: z
      .array(
        z
          .string()
          .describe(
            "News Item. Concise headline-style phrase, ideally <= 95 character",
          ),
      )
      .max(10),
  }),
  execute: async ({ newsItems }) => {
    const redis = await getRedisClient();
    await redis.set("newsMarquee", JSON.stringify(newsItems));
    await redis.set("headLines", JSON.stringify(newsItems));
    console.log(newsItems);
    return { newsItems };
  },
});
