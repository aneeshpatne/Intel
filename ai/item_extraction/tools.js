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
  description: "Select upto 10 news items",
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
    console.log(newsItems);
    return { newsItems };
  },
});
