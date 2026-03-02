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
    "Optional tool for true breaking events only. Trigger only for immediate emergency/security/disaster urgency with active public-impact risk. Do not trigger for trivial facts, routine updates, background context, commentary, or non-urgent economic/logistics developments. Output short Google-search-style topics, not full sentence headlines.",
  inputSchema: z.object({
    headLines: z
      .array(
        z
          .string()
          .describe(
            "Short Google search topic (4-8 words, <= 65 chars), concise and entity-focused.",
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
