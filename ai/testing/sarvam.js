import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { fileURLToPath } from "node:url";
import path from "node:path";


const currentDir = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(path.resolve(currentDir, "../.env"));

const sarvam = createOpenAI({
    baseURL: "https://api.sarvam.ai/v1",
    apiKey: process.env.SARVAM_KEY,
})

const { text } = await generateText({
    model: sarvam.chat("sarvam-30b"),
    prompt: "Hi!"
});

console.log(text);
