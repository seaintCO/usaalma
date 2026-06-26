export async function POST(req:Request) {
  const formData = await req.formData();

  const speech = formData.get("SpeechResult")?.toString() || "";
  const from = formData.get("From")?.toString() || "";

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
