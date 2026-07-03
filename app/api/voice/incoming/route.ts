import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req:Request) {
  const formData = await req.formData();

  const from = formData.get("From")?.toString() || "";
  const to = formData.get("To")?.toString() || "";
  const callSid = formData.get("CallSid")?.toString() || "";

  const supabase = createAdminClient();

  const greeting = "Hello, this is ALMA, the AI receptionist. Please tell me your name and how I can help you today.";

  const { data:turn } = await supabase
    .from("receptionist_call_turns")
    .insert({
      call_sid:callSid,
      phone_from:from,
      phone_to:to,
      user_message:"incoming_call",
      alma_response:greeting,
    })
    .select()
    .single();

  const base = process.env.NEXT_PUBLIC_APP_URL || "";
  const audioUrl = `${base}/api/voice/audio?turnId=${turn?.id}`;

  const response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" language="en-US" timeout="5" action="/api/voice/status" method="POST">
    <Play>${audioUrl}</Play>
  </Gather>
  <Say>Thank you. Goodbye.</Say>
</Response>`;

  return new Response(response, {
    headers:{ "Content-Type":"text/xml" },
  });
}
