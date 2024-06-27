import { scheduleEmailProcessing } from "./queue";

async function main() {
  try {
    console.log("Starting email processing...");
    await scheduleEmailProcessing();
    console.log("Email processing scheduled");
  } catch (error) {
    console.error("Error starting the application:", error);
  }
}

main();
