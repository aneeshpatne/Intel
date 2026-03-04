import { createClient } from "redis";
import express from "express";

const app = express();
const PORT = Number(process.env.PORT ?? 8006);

const redisClient = createClient();
redisClient.on("error", (error) => console.error("Redis client error:", error));
await redisClient.connect();

app.get("/v1/marquee", async (_req, res) => {
  const marquee = await redisClient.get("newsMarquee");
  if (!marquee) {
    return res.status(404).json({
      error: "Not Found",
      message: "No marquee data found",
    });
  }

  try {
    const parsed = JSON.parse(marquee);
    return res.status(200).json(Array.isArray(parsed) ? parsed : []);
  } catch {
    return res.status(200).json([]);
  }
});

app.get("/v1/telegram", async (_req, res) => {
  const data = await redisClient.get("Telegram-Info");
  if (!data || data.length === 0) {
    return res.status(404).json({
      error: "Not Found",
      message: "No telegram data found",
    });
  }

  try {
    return res.status(200).json(JSON.parse(data));
  } catch {
    return res.status(200).json([]);
  }
});

app.get("/v1/breaking-news", async (_req, res) => {
  const articles = await redisClient.lRange("savedArticles", 0, -1);
  if (!articles || articles.length === 0) {
    return res.status(404).json({
      error: "Not Found",
      message: "No breaking news found",
    });
  }

  const parsed = articles
    .map((item) => {
      try {
        return JSON.parse(item);
      } catch {
        return null;
      }
    })
    .filter((item) => item !== null);

  return res.status(200).json(parsed);
});

app.get("/v1/stability/:region", async (req, res) => {
  const { region } = req.params;
  const summary = await redisClient.get(`stability_summary:${region}`);

  if (!summary) {
    return res.status(404).json({
      error: "Not Found",
      message: `No stability summary found for region: ${region}`,
    });
  }

  const summaryText =
    typeof summary === "string" ? summary : summary.toString("utf8");

  try {
    return res.status(200).json(JSON.parse(summaryText));
  } catch {
    return res.status(200).json(summaryText);
  }
});

app.use((req, res) => {
  return res.status(404).json({
    error: "Not Found",
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
