import { tool } from "ai";
import z from "zod";

const itemTool = tool({
  description: "Select upto 10 news items",
  inputSchema: z.object({
    newsItems: z
      .array(
        z
          .string()
          .describe(
            "News Item. Concise headline-style phrase, ideally <= 95 character",
          ),
      )
      .max(10),
  }),
  execute: async ({ newsItems }) => {
    console.log(newsItems);
  },
});
