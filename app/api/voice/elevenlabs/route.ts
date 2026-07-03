import { getCurrentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";

export async function POST(req:Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status:401 });

  const body = await req.json();
  const text = body.text || "Hello, this is ALMA.";

  const supabase = await createClient();

  const { data:connection } = await supabase
    .from("workspace_voice_connections")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const apiKey = connection?.elevenlabs_api_key;
  const voiceId = connection?.elevenlabs_voice_id || "EXAVITQu4vr4xnSDxMaL";

  if (!apiKey) {
    return new Response("Missing ElevenLabs API key. Connect ElevenLabs in Voice Connections.", { status:400 });
  }

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method:"POST",
    headers:{
      "xi-api-key":apiKey,
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
