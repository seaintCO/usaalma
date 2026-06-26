"use client";

import { Mail, Phone, Plus, Users } from "lucide-react";
import { useEffect, useState } from "react";

export default function CRMPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
  });

  async function loadContacts() {
    const res = await fetch("/api/crm/list");
    const data = await res.json();
    if (Array.isArray(data)) setContacts(data);
  }

  async function createContact() {
    if (!form.name.trim()) return;

    await fetch("/api/crm/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setForm({ name: "", email: "", phone: "", company: "" });
    loadContacts();
  }

  useEffect(() => {
    loadContacts();
  }, []);

  return (
    <main className="min-h-screen bg-[#F7F7F8] px-4 py-8 text-[#111111] md:px-6 md:py-10">
      <div className="mx-auto max-w-6xl">
        <a href="/dashboard" className="text-sm text-[#6B7280] hover:text-black">
          ← Volver a ALMA
        </a>

        <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white">
              <Users className="h-5 w-5" />
            </div>
            <h1 className="text-4xl font-medium tracking-tight">CRM</h1>
            <p className="mt-4 text-[#6B7280]">Administra clientes, prospectos y oportunidades.</p>
          </div>
        </div>

        <div className="mt-8 rounded-[2rem] border border-[#E5E7EB] bg-white p-6">
          <div className="grid gap-4 md:grid-cols-4">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-3 outline-none" placeholder="Nombre" />
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-3 outline-none" placeholder="Email" />
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-3 outline-none" placeholder="Teléfono" />
            <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-3 outline-none" placeholder="Empresa" />
          </div>

          <button onClick={createContact} className="mt-4 flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-medium text-white">
            <Plus className="h-4 w-4" /> Nuevo contacto
          </button>
        </div>

        <div className="mt-8 overflow-hidden rounded-[2rem] border border-[#E5E7EB] bg-white">
          {contacts.length === 0 ? (
            <div className="p-6 text-sm text-[#6B7280]">No tienes contactos todavía.</div>
          ) : (
            contacts.map((contact) => (
              <div key={contact.id} className="grid gap-4 border-b border-[#E5E7EB] p-5 last:border-b-0 md:grid-cols-4">
                <div>
                  <div className="font-medium">{contact.name}</div>
                  <div className="text-sm text-[#6B7280]">{contact.company || "Sin empresa"}</div>
                </div>
                <div className="text-sm text-[#6B7280]">{contact.email || "Sin email"}</div>
                <div className="text-sm text-[#6B7280]">{contact.phone || "Sin teléfono"}</div>
                <div className="flex gap-2 md:justify-end">
                  <button className="rounded-full border border-[#E5E7EB] p-2">
                    <Mail className="h-4 w-4" />
                  </button>
                  <button className="rounded-full border border-[#E5E7EB] p-2">
                    <Phone className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
