import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { processEmails } from "./emailProcessor";
import { getAuthenticatedClient } from "./gmailAuth";
import * as dotenv from "dotenv";

dotenv.config();

const connection = new IORedis(process.env.UPSTASH_REDIS_URL!, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  tls: {
    rejectUnauthorized: false,
  },
});

const emailQueue = new Queue("email-processing", { connection });

const worker = new Worker(
  "email-processing",
  async (job) => {
    try {
      const auth = await getAuthenticatedClient();
      await processEmails(auth);
    } catch (error) {
      console.error(`Job ${job.id} failed with error:`, error);
      throw error;
    }
  },
  { connection }
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed with error ${err}`);
});

export async function scheduleEmailProcessing() {
  await emailQueue.add(
    "process-emails",
    {},
    {
      repeat: {
        every: 4 * 60 * 1000, // Re runs every 4 minutes
      },
    }
  );
}
