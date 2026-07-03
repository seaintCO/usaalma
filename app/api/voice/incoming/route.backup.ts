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
  <Say language="es-MX" voice="alice">
    Hola, gracias por llamar. Soy la recepcionista virtual de ALMA. En este momento estamos configurando tu agente de voz.
  </Say>
  <Gather input="speech" language="es-MX" timeout="5" action="/api/voice/status" method="POST">
    <Say language="es-MX" voice="alice">
      Por favor dime tu nombre y en qué puedo ayudarte.
    </Say>
  </Gather>
  <Say language="es-MX" voice="alice">
    Gracias. Hemos recibido tu mensaje.
  </Say>
</Response>`;

  return new Response(response, {
    headers: {
      "Content-Type": "text/xml",
    },
  });
}

