export async function POST(req:Request) {
  const host = process.env.NEXT_PUBLIC_APP_URL?.replace("https://", "").replace("http://", "") || "";

  const response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://${host}/api/voice/ws" />
  </Connect>
</Response>`;

  return new Response(response, {
    headers:{ "Content-Type":"text/xml" },
  });
}
