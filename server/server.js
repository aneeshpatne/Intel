import { createClient } from "redis";
import express from "express";
import { appendFile } from "node:fs";

const app = express();

const client = createClient();

client.on("error", (err) => console.log("Redis Client Error", err));

await client.connect();

app.get("/v1/get_marquee", async (req, res) => {
  const data = await client.get("newsMarquee");
  return res.status(200).json(data);
});

app.get("/v1/get_breaking_news", async (req, res) => {
  const data = await client.lRange("savedArticles", 0, -1);
  return res.status(200).json(data);
});

app.listen(8006, () => {
  console.log("Server is running on port 8006");
});
