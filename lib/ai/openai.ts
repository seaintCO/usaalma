import OpenAI from "openai";
import { modeConfiguration } from "@/lib/usage/modes";
import { withUsageReservation } from "@/lib/usage/service";

export async function askOpenAI(userId: string, prompt: string) {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
  });

  const configured = modeConfiguration("pro");
  const response = await withUsageReservation(
    {
      userId,
      feature: "ai_request",
      mode: "pro",
      model: configured.model,
      units: { requests: 1 },
      idempotencyKey: `presentation:${crypto.randomUUID()}`,
    },
    () =>
      client.responses.create({
        model: configured.model,

        input: prompt,
      }),
  );

  return response.output_text;
}
