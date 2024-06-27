import { gmail_v1, google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import OpenAI from "openai";
import * as dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function processEmails(auth: OAuth2Client) {
  const gmail = google.gmail({ version: "v1", auth });
  const res = await gmail.users.messages.list({
    userId: "me",
    q: "is:unread",
    maxResults: 2,
  });

  const messages = res.data.messages || [];
  console.log("Fetched emails", messages);

  for (const message of messages) {
    const email = await gmail.users.messages.get({
      userId: "me",
      id: message.id!,
    });
    const subject =
      email.data.payload?.headers?.find((h) => h.name === "Subject")?.value ||
      "";
    const body = getEmailBody(email.data);

    const category = await categorizeEmail(subject, body);
    await addLabel(gmail, message.id!, category);

    const reply = await generateReply(category, subject, body);
    await sendReply(gmail, message.id!, reply);

    await gmail.users.messages.modify({
      userId: "me",
      id: message.id!,
      requestBody: { removeLabelIds: ["UNREAD"] },
    });
  }
}

function getEmailBody(message: gmail_v1.Schema$Message): string {
  const body =
    message.payload?.parts?.find((part) => part.mimeType === "text/plain")?.body
      ?.data || message.payload?.body?.data;
  return body ? Buffer.from(body, "base64").toString() : "";
}

async function categorizeEmail(subject: string, body: string): Promise<string> {
  const prompt = `Categorize the following email as "Interested", "Not Interested", or "More Information" based on its content:\n\nSubject: ${subject}\n\nBody: ${body} Only return "Interested", "NOt Interested", or "More information" based on the analyzing the email.`;
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 4,
  });
  console.log(
    "Categorize email response:",
    response.choices[0].message.content
  );
  return response.choices[0].message.content?.trim() || "More Information";
}

async function addLabel(
  gmail: gmail_v1.Gmail,
  messageId: string,
  category: string
) {
  const labelName = `AI_${category.replace(" ", "_")}`;
  let label = await getOrCreateLabel(gmail, labelName);
  await gmail.users.messages.modify({
    userId: "me",
    id: messageId,
    requestBody: { addLabelIds: [label.id!] },
  });
}

async function getOrCreateLabel(gmail: gmail_v1.Gmail, name: string) {
  const res = await gmail.users.labels.list({ userId: "me" });
  let label = res.data.labels?.find((l) => l.name === name);
  if (!label) {
    const createRes = await gmail.users.labels.create({
      userId: "me",
      requestBody: {
        name,
        labelListVisibility: "labelShow",
        messageListVisibility: "show",
      },
    });
    label = createRes.data;
  }
  return label;
}

async function generateReply(
  category: string,
  subject: string,
  body: string
): Promise<string> {
  let prompt = `Generate a polite and professional email reply for the following email based on its category (${category}):\n\nSubject: ${subject}\n\nBody: ${body}\n\nReply:`;

  if (category === "Interested") {
    prompt += `
  Your response should:
  - Thank them for their interest.
  - Suggest a demo call within the next 2 weeks.
  - Propose a specific time for the demo call withing the next 10 days.
  - Mention how excited you are to show them the product/service in action.`;
  } else if (category === "More Information") {
    prompt += `
  Your response should:
  - Thank them for their interest.
  - Ask for more details on what specific information they need.
  - Provide a brief overview of the product/service.
  - Offer to send detailed information or schedule a call to discuss further.`;
  } else if (category === "Not Interested") {
    prompt += `
  Your response should:
  - Thank them for their interest.
  - Express regret that they are not interested at this time.
  - Provide a way to reach out if they change their mind or need more information in the future.`;
  } else {
    prompt += `
  Your response should:
  - Thank them for their interest
  - Provide a way to reach out if they change their mind or need more information in the future.`;
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 200,
  });
  return response.choices[0].message.content || "";
}

async function sendReply(
  gmail: gmail_v1.Gmail,
  messageId: string,
  replyBody: string
) {
  const originalMessage = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
  });
  const headers = originalMessage.data.payload?.headers;
  const to = headers?.find((h) => h.name === "From")?.value;
  const subject = headers?.find((h) => h.name === "Subject")?.value;

  const replyMessage = [
    `To: ${to}`,
    `Subject: Re: ${subject}`,
    "Content-Type: text/plain; charset=utf-8",
    "MIME-Version: 1.0",
    "",
    replyBody,
  ].join("\n");

  await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: Buffer.from(replyMessage).toString("base64"),
      threadId: originalMessage.data.threadId,
    },
  });
}
