import { createClient } from "@/lib/supabase/server";

function escapeXml(input:string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function POST(req:Request) {
  const formData = await req.formData();

  const speech = formData.get("SpeechResult")?.toString() || "";
  const from = formData.get("From")?.toString() || "";
  const to = formData.get("To")?.toString() || "";
  const callSid = formData.get("CallSid")?.toString() || "";

  let almaResponse = "Thank you. I captured that. Is there anything else I can help you with?";

  try {
    const brainRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ""}/api/receptionist/brain`, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({
        businessName:"ALMA Client",
        businessType:"service business",
        callerMessage:speech,
      }),
    });

    const brain = await brainRes.json();
    almaResponse = brain.response || almaResponse;
  } catch {}

  try {
    const supabase = await createClient();
    await supabase.from("receptionist_call_turns").insert({
      call_sid:callSid,
      phone_from:from,
      phone_to:to,
      user_message:speech,
      alma_response:almaResponse,
    });
  } catch {}

  const safe = escapeXml(almaResponse);

  const response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" language="en-US" timeout="5" action="/api/voice/status" method="POST">
    <Say language="en-US" voice="alice">${safe}</Say>
  </Gather>
  <Say language="en-US" voice="alice">Thank you for calling. Goodbye.</Say>
</Response>`;

  return new Response(response, {
    headers:{ "Content-Type":"text/xml" },
  });
}
