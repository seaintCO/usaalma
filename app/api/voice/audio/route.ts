import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req:Request) {
  const { searchParams } = new URL(req.url);
  const turnId = searchParams.get("turnId");

  if (!turnId) return new Response("Missing turnId", { status:400 });

  const supabase = createAdminClient();

  const { data:turn } = await supabase
    .from("receptionist_call_turns")
    .select("*")
    .eq("id", turnId)
    .maybeSingle();

  if (!turn) return new Response("Turn not found", { status:404 });

  const { data:connection } = await supabase
    .from("workspace_voice_connections")
    .select("*")
    .eq("twilio_phone_number", turn.phone_to)
    .maybeSingle();

  if (!connection?.elevenlabs_api_key) {
    return new Response("Missing customer ElevenLabs key", { status:400 });
  }

  const voiceId = connection.elevenlabs_voice_id || "EXAVITQu4vr4xnSDxMaL";

  const eleven = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method:"POST",
    headers:{
      "xi-api-key":connection.elevenlabs_api_key,
      "Content-Type":"application/json",
      "Accept":"audio/mpeg",
    },
    body:JSON.stringify({
      text:turn.alma_response || "Hello, this is ALMA.",
      model_id:"eleven_multilingual_v2",
      voice_settings:{
        stability:0.55,
        similarity_boost:0.75,
        style:0.25,
        use_speaker_boost:true
      }
    }),
  });

  if (!eleven.ok) {
    const err = await eleven.text();
    return new Response(err, { status:400 });
  }

  const audio = await eleven.arrayBuffer();

  return new Response(audio, {
    headers:{
      "Content-Type":"audio/mpeg",
      "Cache-Control":"no-store",
    },
  });
}
