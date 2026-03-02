import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

const { text } = await generateText({
  model: openai("gpt-5.2-codex"),
  prompt: "Invent a new holiday and describe its traditions.",
});

console.log(text);
