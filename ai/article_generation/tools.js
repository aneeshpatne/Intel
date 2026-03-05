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

export const itemTool = tool({
  description:
    "Select up to 20 most important stories for the primary marquee/news feed.",
  inputSchema: z.object({
    newsItems: z
      .array(
        z
          .string()
          .describe(
            "News Item. Concise headline-style phrase, ideally <= 95 character",
          ),
      )
      .max(20),
  }),
  execute: async ({ newsItems }) => {
    const redis = await getRedisClient();
    await redis.set("newsMarquee", JSON.stringify(newsItems));
    console.log(newsItems);
    return { newsItems };
  },
});

export const ArticleTool = tool({
  description:
    "Use this tool to select at most 3 news items that are important and need different article",
  inputSchema: z.object({
    articles: z.array(
      z.object({
        title: z.string().describe("The title of the news"),
        initialData: z.string().describe("The initial data that you have"),
      }),
    ),
  }),
  execute: async ({ articles }) => {
    const redis = await getRedisClient();
    await redis.set("selectedArticles", JSON.stringify(articles));
    console.log(articles);
    return { articles };
  },
});

export const Coordinates = tool({
  description:
    "Persist map-ready coordinates for conflict, weather, and concern locations. Each point must use decimal degrees with latitude first and longitude second.",
  inputSchema: z.object({
    conflict: z.array(
      z.object({
        latitude: z
          .number()
          .min(-90)
          .max(90)
          .describe("Latitude in decimal degrees, range -90 to 90."),
        longitude: z
          .number()
          .min(-180)
          .max(180)
          .describe("Longitude in decimal degrees, range -180 to 180."),
      }),
    ),
    weather: z.array(
      z.object({
        latitude: z
          .number()
          .min(-90)
          .max(90)
          .describe("Latitude in decimal degrees, range -90 to 90."),
        longitude: z
          .number()
          .min(-180)
          .max(180)
          .describe("Longitude in decimal degrees, range -180 to 180."),
      }),
    ),
    concern: z.array(
      z.object({
        latitude: z
          .number()
          .min(-90)
          .max(90)
          .describe("Latitude in decimal degrees, range -90 to 90."),
        longitude: z
          .number()
          .min(-180)
          .max(180)
          .describe("Longitude in decimal degrees, range -180 to 180."),
      }),
    ),
  }),
  execute: async ({ conflict, weather, concern }) => {
    const coordinates = { conflict, weather, concern };
    const redis = await getRedisClient();
    await redis.set("Coordinates", JSON.stringify(coordinates));
    console.log(coordinates);
    return coordinates;
  },
});
