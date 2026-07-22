import OpenAI from "openai";
import { createAdminClient } from "@/lib/supabase/admin";
import { modeConfiguration } from "@/lib/usage/modes";
import { withUsageReservation } from "@/lib/usage/service";
import { withUsageRoute } from "@/lib/usage/routeBoundary";

function escapeXml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function post(req: Request) {
  const formData = await req.formData();

  const speech = formData.get("SpeechResult")?.toString() || "";
  const from = formData.get("From")?.toString() || "";
  const to = formData.get("To")?.toString() || "";
  const callSid = formData.get("CallSid")?.toString() || "";

  const supabase = createAdminClient();

  const { data: connection } = await supabase
    .from("workspace_voice_connections")
    .select("*")
    .eq("twilio_phone_number", to)
    .maybeSingle();

  let almaResponse =
    "Thank you. I captured that. Is there anything else I can help you with?";

  if (process.env.OPENAI_API_KEY && connection?.user_id) {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const configured = modeConfiguration("instant");
    const completion = await withUsageReservation(
      {
        userId: connection.user_id,
        feature: "ai_request",
        mode: "instant",
        model: configured.model,
        units: { requests: 1 },
        idempotencyKey: `voice-turn:${callSid}:${speech.slice(0, 32)}`,
      },
      () =>
        client.chat.completions.create({
          model: configured.model,
          messages: [
            {
              role: "system",
              content: `You are ALMA Receptionist. Be warm, professional, and concise. Capture caller name, phone, reason, urgency, and preferred callback time. Never say you are ChatGPT.`,
            },
            {
              role: "user",
              content: `Caller said: ${speech}`,
            },
          ],
        }),
    );

    almaResponse = completion.choices[0]?.message?.content || almaResponse;
  }

  const leadSummary = almaResponse;

  await supabase
    .from("receptionist_leads")
    .insert({
      user_id: connection?.user_id,
      phone_from: from,
      phone_to: to,
      call_sid: callSid,
      caller_name: "",
      reason: speech,
      urgency: /urgent|emergency|asap|today|now/i.test(speech)
        ? "urgent"
        : "normal",
      preferred_callback_time: "",
      summary: leadSummary,
      status: "new",
    })
    .select()
    .single();

  const { data: turn } = await supabase
    .from("receptionist_call_turns")
    .insert({
      call_sid: callSid,
      phone_from: from,
      phone_to: to,
      user_message: speech,
      alma_response: almaResponse,
    })
    .select()
    .single();

  const base = process.env.NEXT_PUBLIC_APP_URL || "";
  const audioUrl = `${base}/api/voice/audio?turnId=${turn?.id}`;

  const response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" language="en-US" timeout="5" action="/api/voice/status" method="POST">
    <Play>${escapeXml(audioUrl)}</Play>
  </Gather>
  <Say>Thank you for calling. Goodbye.</Say>
</Response>`;

  return new Response(response, {
    headers: { "Content-Type": "text/xml" },
  });
}
export const POST = withUsageRoute(post);
