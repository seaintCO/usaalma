import { CallLogRepository } from "@/lib/db/repositories/calls/callLog.repository";

export async function POST(req:Request) {
  const formData = await req.formData();

  const from = formData.get("From")?.toString() || "";
  const to = formData.get("To")?.toString() || "";
  const callSid = formData.get("CallSid")?.toString() || "";

  await CallLogRepository.create({
    from,
    to,
    callSid,
    status:"incoming"
  });

  const response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" language="en-US" timeout="5" action="/api/voice/status" method="POST">
    <Say language="en-US" voice="alice">
      Hello, this is ALMA, the virtual receptionist. Please tell me your name and how I can help you.
    </Say>
  </Gather>
  <Say language="en-US" voice="alice">
    Thank you. We received your message and someone will follow up shortly.
  </Say>
</Response>`;

  return new Response(response, {
    headers:{ "Content-Type":"text/xml" },
  });
}
