import { scrape } from "./scrape.js";

const res = await fetch("http://192.168.0.99:8000/v1/news", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ query: "Iran - Israel War", max_results: 5 }),
});

const data = await res.json();
const urls = Array.isArray(data) ? data : (data?.urls ?? []);
const scrapedContent = await scrape(urls);
const metadata = scrapedContent.map((item) => ({
  url: item.url,
  ogImage: item.ogImage,
}));
console.log(metadata);
let start = 5;
const text = scrapedContent
  .map(
    (item, index) =>
      `[${index + start + 1}]. ${item.textContent.substring(500, 1500)}`,
  )
  .join("\n");
console.log(text);
