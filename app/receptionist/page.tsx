"use client";

import { Bot, Phone, Plus, UserRound, MessageSquare, AlertTriangle, Save, Send } from "lucide-react";
import { useEffect, useState } from "react";

export default function ReceptionistPage() {
  const [items, setItems] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [calls, setCalls] = useState<any[]>([]);
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [greeting, setGreeting] = useState("");
  const [editingLead, setEditingLead] = useState<any>(null);

  async function loadReceptionists() {
    const res = await fetch("/api/receptionist/list");
    const data = await res.json();
    if (Array.isArray(data)) setItems(data);
  }

  async function loadLeads() {
    const data = await fetch("/api/receptionist/v2/leads").then(r=>r.json());
    if (Array.isArray(data)) setLeads(data);
  }

  async function loadCalls() {
    const data = await fetch("/api/receptionist/v2/calls").then(r=>r.json());
    if (Array.isArray(data)) setCalls(data);
  }

  async function refreshAll() {
    await Promise.all([loadReceptionists(), loadLeads(), loadCalls()]);
  }

  async function deployReceptionist(id:string) {
    await fetch("/api/receptionist/deploy", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ id }),
    });

    refreshAll();
  }

  async function createReceptionist() {
    if (!businessName.trim()) return;

    await fetch("/api/receptionist/create", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({
        businessName,
        businessType,
        phoneNumber,
        greeting,
        language:"en",
      }),
    });

    setBusinessName("");
    setBusinessType("");
    setPhoneNumber("");
    setGreeting("");
    refreshAll();
  }

  async function saveLead() {
    if (!editingLead) return;

    await fetch("/api/receptionist/v2/leads", {
      method:"PATCH",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify(editingLead),
    });

    setEditingLead(null);
    refreshAll();
  }

  async function createFollowup(lead:any) {
    const recipient = lead.phone_from;

    const res = await fetch("/api/receptionist/v2/followup", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({
        lead_id:lead.id,
        recipient,
        channel:"sms",
        caller_name:lead.caller_name,
      }),
    });

    const data = await res.json();

    if (!res.ok) alert(data.error || "Could not create follow-up.");
    else alert("Follow-up draft created.");
  }

  useEffect(() => {
    refreshAll();
  }, []);

  const urgentLeads = leads.filter((l:any)=>l.urgency === "urgent").length;
  const newLeads = leads.filter((l:any)=>l.status === "new").length;

  return (
    <main className="min-h-screen bg-[#F7F7F8] px-4 py-8 text-[#111111] md:px-6 md:py-10">
      <div className="mx-auto max-w-7xl">
        <a href="/dashboard" className="text-sm text-[#6B7280] hover:text-black">← Back to ALMA</a>

        <div className="mt-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white">
              <Bot className="h-5 w-5" />
            </div>
            <h1 className="text-4xl font-medium tracking-tight md:text-5xl">AI Receptionist</h1>
            <p className="mt-4 max-w-2xl text-lg text-[#6B7280]">
              Twilio + ElevenLabs receptionist that captures callers, creates leads, and prepares follow-ups.
            </p>
          </div>

          <a href="/voice-connections" className="rounded-full bg-black px-5 py-3 text-sm font-medium text-white">
            Connect Twilio + ElevenLabs
          </a>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
            <div className="text-sm text-[#6B7280]">Receptionists</div>
            <div className="mt-1 text-3xl font-medium">{items.length}</div>
          </div>
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
            <div className="text-sm text-[#6B7280]">New Leads</div>
            <div className="mt-1 text-3xl font-medium">{newLeads}</div>
          </div>
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
            <div className="text-sm text-[#6B7280]">Urgent</div>
            <div className="mt-1 text-3xl font-medium">{urgentLeads}</div>
          </div>
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
            <div className="text-sm text-[#6B7280]">Call Turns</div>
            <div className="mt-1 text-3xl font-medium">{calls.length}</div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[380px_1fr]">
          <section className="space-y-6">
            <div className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6">
              <h2 className="text-2xl font-medium">Create receptionist</h2>

              <div className="mt-6 grid gap-3">
                <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Business name" className="rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-3 outline-none" />
                <input value={businessType} onChange={(e) => setBusinessType(e.target.value)} placeholder="Business type" className="rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-3 outline-none" />
                <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="Twilio phone number" className="rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-3 outline-none" />
                <input value={greeting} onChange={(e) => setGreeting(e.target.value)} placeholder="Initial greeting" className="rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-3 outline-none" />
              </div>

              <button onClick={createReceptionist} className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-medium text-white">
                <Plus className="h-4 w-4" /> Create receptionist
              </button>
            </div>

            <div className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6">
              <h2 className="text-2xl font-medium">Receptionists</h2>
              <div className="mt-5 space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="rounded-[1.5rem] border border-[#E5E7EB] bg-[#F7F7F8] p-4">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div className="text-lg font-medium">{item.business_name}</div>
                    <p className="mt-1 text-sm text-[#6B7280]">{item.business_type || "No type"}</p>
                    <p className="mt-1 text-sm text-[#6B7280]">{item.phone_number || "No number"}</p>
                    <div className="mt-3 inline-block rounded-full bg-yellow-50 px-3 py-1 text-xs font-medium text-yellow-700">{item.status}</div>

                    {item.status !== "ready" && (
                      <button onClick={() => deployReceptionist(item.id)} className="mt-4 block rounded-full bg-black px-4 py-2 text-xs font-medium text-white">
                        Prepare to activate
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6">
              <h2 className="flex items-center gap-2 text-2xl font-medium"><UserRound className="h-5 w-5" /> Captured Leads</h2>

              <div className="mt-5 space-y-3">
                {leads.length === 0 && <div className="rounded-2xl bg-[#F7F7F8] p-5 text-[#6B7280]">No leads captured yet.</div>}

                {leads.map((lead:any) => (
                  <div key={lead.id} className="rounded-2xl bg-[#F7F7F8] p-5">
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{lead.caller_name || lead.phone_from || "Unknown caller"}</div>
                          {lead.urgency === "urgent" && <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-xs text-red-700"><AlertTriangle className="h-3 w-3" /> urgent</span>}
                        </div>
                        <div className="mt-1 text-sm text-[#6B7280]">{lead.phone_from}</div>
                        <div className="mt-3 text-sm leading-6">{lead.summary || lead.reason}</div>
                        <div className="mt-2 text-xs text-[#6B7280]">Status: {lead.status}</div>
                      </div>

                      <div className="flex gap-2">
                        <button onClick={()=>setEditingLead(lead)} className="rounded-full border bg-white px-3 py-2 text-xs">Edit</button>
                        <button onClick={()=>createFollowup(lead)} className="flex items-center gap-1 rounded-full bg-black px-3 py-2 text-xs text-white"><Send className="h-3 w-3" /> Follow-up</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {editingLead && (
              <div className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6">
                <h2 className="text-2xl font-medium">Edit lead</h2>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <input value={editingLead.caller_name || ""} onChange={e=>setEditingLead({...editingLead, caller_name:e.target.value})} placeholder="Caller name" className="rounded-2xl bg-[#F7F7F8] px-4 py-3 outline-none" />
                  <input value={editingLead.urgency || ""} onChange={e=>setEditingLead({...editingLead, urgency:e.target.value})} placeholder="Urgency" className="rounded-2xl bg-[#F7F7F8] px-4 py-3 outline-none" />
                  <input value={editingLead.preferred_callback_time || ""} onChange={e=>setEditingLead({...editingLead, preferred_callback_time:e.target.value})} placeholder="Callback time" className="rounded-2xl bg-[#F7F7F8] px-4 py-3 outline-none" />
                  <input value={editingLead.status || ""} onChange={e=>setEditingLead({...editingLead, status:e.target.value})} placeholder="Status" className="rounded-2xl bg-[#F7F7F8] px-4 py-3 outline-none" />
                  <textarea value={editingLead.reason || ""} onChange={e=>setEditingLead({...editingLead, reason:e.target.value})} placeholder="Reason" className="min-h-24 rounded-2xl bg-[#F7F7F8] p-4 outline-none md:col-span-2" />
                </div>
                <button onClick={saveLead} className="mt-4 flex items-center gap-2 rounded-2xl bg-black px-5 py-3 text-white"><Save className="h-4 w-4" /> Save lead</button>
              </div>
            )}

            <div className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6">
              <h2 className="flex items-center gap-2 text-2xl font-medium"><MessageSquare className="h-5 w-5" /> Recent Call Turns</h2>

              <div className="mt-5 space-y-3">
                {calls.length === 0 && <div className="rounded-2xl bg-[#F7F7F8] p-5 text-[#6B7280]">No calls yet.</div>}

                {calls.map((call:any) => (
                  <div key={call.id} className="rounded-2xl bg-[#F7F7F8] p-4">
                    <div className="text-sm font-medium">{call.phone_from} → {call.phone_to}</div>
                    <div className="mt-2 text-xs text-[#6B7280]">Caller said:</div>
                    <div className="text-sm">{call.user_message}</div>
                    <div className="mt-2 text-xs text-[#6B7280]">ALMA said:</div>
                    <div className="text-sm">{call.alma_response}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
