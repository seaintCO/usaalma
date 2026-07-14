import OpenAI from "openai";
import { searchGmail, createGmailDraft, sendGmail } from "@/lib/google/gmail";

export async function summarizeGmailTool(userId:string, query:string = "in:inbox newer_than:7d") {
  const emails = await searchGmail(userId, query, 10);

  if (!process.env.OPENAI_API_KEY) {
    return {
      success:true,
      message:"Gmail summary created.",
      summary:emails.map((e:any) => `${e.subject}: ${e.snippet}`).join("\n"),
      emails,
    };
  }

  const client = new OpenAI({ apiKey:process.env.OPENAI_API_KEY });

  const response = await client.responses.create({
    model:(await import("@/lib/ai/models")).OPENAI_MODELS.deep,
    input:`Summarize these Gmail messages for the user. Include important items and suggested next actions.\n\n${JSON.stringify(emails, null, 2)}`
  });

  return {
    success:true,
    message:"Gmail summarized.",
    summary:response.output_text,
    emails,
  };
}

export async function draftGmailTool(userId:string, to:string, subject:string, body:string) {
  const draft = await createGmailDraft(userId, { to, subject, body });

  return {
    success:true,
    message:`Draft created for ${to}.`,
    draft,
  };
}

export async function sendGmailTool(userId:string, to:string, subject:string, body:string) {
  const sent = await sendGmail(userId, { to, subject, body });

  return {
    success:true,
    message:`Email sent to ${to}.`,
    sent,
  };
}
