import { tool } from "ai";
import { z } from "zod";
import { createClient } from "redis";

let redisClientPromise;

function getRedisClient() {
  if (!redisClientPromise) {
    const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
    const client = createClient({ url: redisUrl });
    redisClientPromise = client.connect().then(() => client);
  }
  return redisClientPromise;
}

export const SaveTool = tool({
  description: "Use this tool to save the extracted snippets",
  inputSchema: z.object({
    newsItem: z.array(
      z.object({
        title: z
          .string()
          .describe("Title of the news snippet. less than 50 chars"),
        description: z.string().describe("Description of news, detailed"),
        short_description: z
          .string()
          .describe("Short description of the news less than 100 chars"),
      }),
    ),
  }),
  execute: async ({ newsItem }) => {
    const redis = await getRedisClient();
    await redis.set("Telegram-Info", JSON.stringify(newsItem));
    console.log(newsItem);
    return "saved";
  },
});
