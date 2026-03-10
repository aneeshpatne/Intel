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
    console.log("Additional News Tool Invoked: ", articles);
    const redis = await getRedisClient();
    await redis.set("selectedArticles", JSON.stringify(articles));
    const titles = articles.map((item) => item.title);
    await redis.rPush("selectedArticles:list", titles);
    console.log(articles);
    return { articles };
  },
});
