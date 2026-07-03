export async function POST(req:Request) {
  const body = await req.json();
  const text = body.text || "Hello, this is ALMA.";

  if (!process.env.ELEVENLABS_API_KEY) {
    return new Response("Missing ELEVENLABS_API_KEY", { status:400 });
  }

  const voiceId = process.env.ELEVENLABS_VOICE_ID || "EXAVITQu4vr4xnSDxMaL";

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method:"POST",
    headers:{
      "xi-api-key":process.env.ELEVENLABS_API_KEY,
      "Content-Type":"application/json",
      "Accept":"audio/mpeg",
    },
    body:JSON.stringify({
      text,
      model_id:"eleven_multilingual_v2",
      voice_settings:{
        stability:0.55,
        similarity_boost:0.75,
        style:0.25,
        use_speaker_boost:true
      }
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return new Response(err, { status:400 });
  }

  const audio = await res.arrayBuffer();

  return new Response(audio, {
    headers:{
      "Content-Type":"audio/mpeg",
      "Cache-Control":"no-store",
    },
  });
}
