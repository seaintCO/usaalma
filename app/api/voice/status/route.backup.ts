import { CallLogRepository } from "@/lib/db/repositories/calls/callLog.repository";

export async function POST(req:Request) {
  const formData = await req.formData();

  const speech = formData.get("SpeechResult")?.toString() || "";
  const from = formData.get("From")?.toString() || "";
  const to = formData.get("To")?.toString() || "";
  const callSid = formData.get("CallSid")?.toString() || "";

  await CallLogRepository.create({
    from,
    to,
    speech,
    callSid,
    status:"speech_received"
  });

  console.log("Voice message received", {
    from,
    speech,
  });

  const response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="es-MX" voice="alice">
    Gracias. Ya tengo tu mensaje. Alguien del equipo te contactará pronto.
  </Say>
</Response>`;

  return new Response(response, {
    headers: {
      "Content-Type": "text/xml",
    },
  });
}

