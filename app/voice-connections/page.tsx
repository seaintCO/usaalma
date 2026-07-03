"use client";

import { useEffect, useState } from "react";

export default function VoiceConnectionsPage() {
  const [form, setForm] = useState<any>({
    twilio_account_sid:"",
    twilio_auth_token:"",
    twilio_phone_number:"",
    elevenlabs_api_key:"",
    elevenlabs_voice_id:"",
  });

  async function load() {
    const data = await fetch("/api/integrations/voice/get").then(r=>r.json());
    setForm((prev:any)=>({
      ...prev,
      twilio_account_sid:data.twilio_account_sid || "",
      twilio_phone_number:data.twilio_phone_number || "",
      elevenlabs_voice_id:data.elevenlabs_voice_id || "",
    }));
  }

  async function save() {
    const res = await fetch("/api/integrations/voice/save", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify(form),
    });

    const data = await res.json();
    if (!res.ok) alert(data.error || "Could not save connection.");
    else alert("Voice connections saved.");
  }

  useEffect(()=>{ load(); }, []);

  return (
    <main className="min-h-screen bg-[#F7F7F8] px-4 py-8 text-[#111] md:px-6 md:py-10">
      <div className="mx-auto max-w-3xl">
        <a href="/dashboard" className="text-sm text-[#6B7280] hover:text-black">← Back to ALMA</a>

        <div className="mt-8 rounded-[2rem] border border-[#E5E7EB] bg-white p-6 md:p-8">
          <h1 className="text-4xl font-medium tracking-tight">Voice Connections</h1>
          <p className="mt-3 text-[#6B7280]">
            Connect your own Twilio and ElevenLabs accounts. ALMA uses your OpenAI brain, but your business controls voice and phone costs.
          </p>

          <div className="mt-8 space-y-4">
            <input value={form.twilio_account_sid} onChange={e=>setForm({...form, twilio_account_sid:e.target.value})} placeholder="Twilio Account SID" className="w-full rounded-2xl bg-[#F7F7F8] px-4 py-3 outline-none" />
            <input value={form.twilio_auth_token} onChange={e=>setForm({...form, twilio_auth_token:e.target.value})} placeholder="Twilio Auth Token" type="password" className="w-full rounded-2xl bg-[#F7F7F8] px-4 py-3 outline-none" />
            <input value={form.twilio_phone_number} onChange={e=>setForm({...form, twilio_phone_number:e.target.value})} placeholder="Twilio Phone Number" className="w-full rounded-2xl bg-[#F7F7F8] px-4 py-3 outline-none" />

            <div className="my-6 border-t border-[#E5E7EB]" />

            <input value={form.elevenlabs_api_key} onChange={e=>setForm({...form, elevenlabs_api_key:e.target.value})} placeholder="ElevenLabs API Key" type="password" className="w-full rounded-2xl bg-[#F7F7F8] px-4 py-3 outline-none" />
            <input value={form.elevenlabs_voice_id} onChange={e=>setForm({...form, elevenlabs_voice_id:e.target.value})} placeholder="ElevenLabs Voice ID" className="w-full rounded-2xl bg-[#F7F7F8] px-4 py-3 outline-none" />

            <button onClick={save} className="w-full rounded-2xl bg-black py-3 font-medium text-white">
              Save connections
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
