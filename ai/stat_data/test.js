import { createClient } from "redis";
import { array } from "zod";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const redis = createClient({ url: redisUrl });
await redis.connect();

const keys = [];
const data = await redis.lRange("marqueeItems", 0, -1);
console.log(data.join("\n"));

for await (const batch of redis.scanIterator({ MATCH: "coordinates:*" })) {
  keys.push(...batch);
}


let result = await Promise.all(
    keys.map(async(key) => {
        return await redis.lRange(key, 0, -1);
    })
)

console.log(
  result
    .flat()
    .map(i => JSON.parse(i)[2])
    .join("\n")
);
await redis.quit();
