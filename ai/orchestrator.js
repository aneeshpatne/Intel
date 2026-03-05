import { Queue, Worker } from "bullmq";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { runTelegramPipeline } from "./telegram/pipeline.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(path.resolve(currentDir, ".env"));

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const queueName = process.env.TG_QUEUE_NAME || "telegram-pipeline-queue";
const cronPattern = process.env.TG_PIPELINE_CRON || "30 6-20/2 * * *";
const cronTimezone = process.env.TG_PIPELINE_TZ || "Asia/Kolkata";
const connection = { url: redisUrl };

const queue = new Queue(queueName, { connection });

async function resetQueue() {
  console.log(`[orchestrator] resetting queue '${queueName}'`);
  await queue.obliterate({ force: true });

  // Clean scheduler metadata so startup is always fresh.
  const schedulers = await queue.getJobSchedulers();
  for (const scheduler of schedulers) {
    const schedulerId = scheduler.id || scheduler.key;
    if (schedulerId) {
      await queue.removeJobScheduler(schedulerId);
    }
  }
}

const jobSchedulerId = "telegram-pipeline-cron";

await resetQueue();

const worker = new Worker(
  queueName,
  async () => {
    await runTelegramPipeline();
  },
  {
    connection,
    concurrency: 1,
  },
);

worker.on("completed", (job) => {
  console.log(`[orchestrator] completed job ${job.id}`);
});

worker.on("failed", (job, err) => {
  console.error(`[orchestrator] failed job ${job?.id ?? "unknown"}:`, err);
});

await queue.upsertJobScheduler(
  jobSchedulerId,
  {
    pattern: cronPattern,
    tz: cronTimezone,
  },
  {
    name: "telegram-pipeline",
    data: {},
    opts: {
      removeOnComplete: 25,
      removeOnFail: 50,
    },
  },
);

console.log(`[orchestrator] scheduled telegram pipeline with cron '${cronPattern}' (${cronTimezone})`);
console.log(`[orchestrator] queue='${queueName}' redis='${redisUrl}'`);

async function shutdown(signal) {
  console.log(`[orchestrator] received ${signal}; shutting down`);
  await worker.close();
  await queue.close();
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
