"use client";

import { Bot, Phone, Plus } from "lucide-react";
import { useEffect, useState } from "react";

export default function ReceptionistPage() {
  const [items, setItems] = useState<any[]>([]);
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [greeting, setGreeting] = useState("");

  async function loadReceptionists() {
    const res = await fetch("/api/receptionist/list");
    const data = await res.json();
    if (Array.isArray(data)) setItems(data);
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
        language:"es",
      }),
    });

    setBusinessName("");
    setBusinessType("");
    setPhoneNumber("");
    setGreeting("");
    loadReceptionists();
  }

  useEffect(() => {
    loadReceptionists();
  }, []);

  return (
    <main className="min-h-screen bg-[#F7F7F8] px-4 py-8 text-[#111111] md:px-6 md:py-10">
      <div className="mx-auto max-w-6xl">
        <a href="/dashboard" className="text-sm text-[#6B7280] hover:text-black">
          ← Volver a ALMA
        </a>

        <div className="mt-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white">
            <Bot className="h-5 w-5" />
          </div>
          <h1 className="text-4xl font-medium tracking-tight md:text-5xl">
            Recepcionista IA
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-[#6B7280]">
            Construye una recepcionista para contestar llamadas, capturar información y ayudar a tus clientes.
          </p>
        </div>

        <div className="mt-8 rounded-[2rem] border border-[#E5E7EB] bg-white p-6">
          <h2 className="text-2xl font-medium">Crear recepcionista</h2>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Nombre del negocio" className="rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-3 outline-none" />
            <input value={businessType} onChange={(e) => setBusinessType(e.target.value)} placeholder="Tipo de negocio" className="rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-3 outline-none" />
            <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="Número de teléfono" className="rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-3 outline-none" />
            <input value={greeting} onChange={(e) => setGreeting(e.target.value)} placeholder="Saludo inicial" className="rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-3 outline-none" />
          </div>

          <button onClick={createReceptionist} className="mt-5 flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-medium text-white">
            <Plus className="h-4 w-4" /> Crear recepcionista
          </button>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-[1.5rem] border border-[#E5E7EB] bg-white p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7F7F8]">
                <Phone className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-medium">{item.business_name}</h3>
              <p className="mt-2 text-sm text-[#6B7280]">{item.business_type || "Sin tipo"}</p>
              <p className="mt-2 text-sm text-[#6B7280]">{item.phone_number || "Sin número"}</p>
              <div className="mt-4 rounded-full bg-yellow-50 px-3 py-1 text-xs font-medium text-yellow-700 inline-block">
                {item.status}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
