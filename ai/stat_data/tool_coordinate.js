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

const coordinateEntrySchema = z.object({
  longitude: z
    .number()
    .min(-180)
    .max(180)
    .describe("Longitude of the event location, from -180 to 180."),
  latitude: z
    .number()
    .min(-90)
    .max(90)
    .describe("Latitude of the event location, from -90 to 90."),
  desc: z
    .string()
    .max(50)
    .describe("Short description of what happened at this point. 50 chars max"),
});

function toCoordinateTuples(entries) {
  if (!Array.isArray(entries)) return [];
  return entries.map(({ longitude, latitude, desc }) => [
    latitude,
    longitude,
    desc,
  ]);
}

export const CoordinateTool = tool({
  description: "Use this tool to mark coordinates of events of interest.",
  inputSchema: z.object({
    conflict: z
      .array(coordinateEntrySchema)
      .describe("Conflict-related event points."),
    concern: z
      .array(coordinateEntrySchema)
      .describe("Concern or risk-related event points."),
    weather: z.array(coordinateEntrySchema).describe("Weather-related points."),
  }),
  execute: async ({ conflict, concern, weather }) => {
    const redis = await getRedisClient();
    console.log("Coordinate Tool Invoked");
    console.log({conflict, concern, weather})
    const payloads = {
      "coordinates:conflict": toCoordinateTuples(conflict),
      "coordinates:concern": toCoordinateTuples(concern),
      "coordinates:weather": toCoordinateTuples(weather),
    };

    for (const [key, value] of Object.entries(payloads)) {
      await redis.del(key);
      if (value.length > 0) {
        const entries = value.map((entry) => JSON.stringify(entry));
        await redis.rPush(key, ...entries);
      }
    }

    return payloads;
  },
});
