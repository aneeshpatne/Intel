import { tool } from "ai";
import { z } from "zod";
import { scrape } from "./scrape.js";
import { createClient } from "redis";

const NEWS_API_URL =
  process.env.DEEP_SEARCH_URL || "http://192.168.0.99:8000/v1/news";
const SAVED_ARTICLES_KEY = process.env.SAVED_ARTICLES_KEY || "savedArticles";

let redisClientPromise;

function getRedisClient() {
  if (!redisClientPromise) {
    const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
    const client = createClient({ url: redisUrl });
    redisClientPromise = client.connect().then(() => client);
  }
  return redisClientPromise;
}

export const metadata = [];
let startCount = 0;

export function setWebSearchStartCount(value) {
  startCount = Number.isFinite(value) ? value : 0;
}

export const WebSearchTool = tool({
  description: "Use this tool to search the web, use short terms",
  inputSchema: z.object({
    searchTerm: z.string().describe("Short Search Term"),
  }),
  execute: async ({ searchTerm }) => {
    console.log("------------------SEARCH-TOOL-INVOKED------------------");
    console.log("Search Term:", searchTerm);
    const res = await fetch(NEWS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: searchTerm, max_results: 5 }),
    });

    const data = await res.json();
    const urls = Array.isArray(data) ? data : (data?.urls ?? []);
    const scrapedContent = await scrape(urls);

    metadata.push(
      ...scrapedContent.map((item) => ({
        url: item.url,
        ogImage: item.ogImage,
      })),
    );

    const text = scrapedContent
      .map(
        (item, index) =>
          `[${index + startCount + 1}]. ${item.textContent.substring(500, 1500)}`,
      )
      .join("\n");

    startCount += scrapedContent.length;

    return text;
  },
});

export const SaveArticle = tool({
  description: "Save the Article you have extracted",
  inputSchema: z.object({
    article: z.object({
      title: z
        .string()
        .describe("Nice Editorial Headline, Should be around 4-5 words only."),
      newsContent: z.string().describe("Content of the article in markdown"),
    }),
  }),
  execute: async ({ article }) => {
    const redis = await getRedisClient();
    await redis.rPush(SAVED_ARTICLES_KEY, JSON.stringify(article));
    return "saved";
  },
});
