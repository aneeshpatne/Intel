import { tool } from "ai";
import { createClient } from "redis";
import z from "zod";

let redisClientPromise;

function getRedisClient() {
  if (!redisClientPromise) {
    const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
    const client = createClient({ url: redisUrl });
    redisClientPromise = client.connect().then(() => client);
  }

  return redisClientPromise;
}
export const MarqueeItems = tool({
  description:
    "Use this tool to save, news. The saved news items should be less than 60 chars",
  inputSchema: z.object({
    marquee: z.array(z.string().describe("News Item")),
  }),
  execute: async ({ marquee }) => {
    const redis = await getRedisClient();
    console.log("Marquee Tool Invoked");
    if (marquee.length === 0) {
      return "No items to save";
    }

    await redis.rPush("marqueeItems", marquee);
    return "Saved";
  },
});
