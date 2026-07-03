"use client";

import { useState } from "react";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function signup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setLoading(false);
      alert(data.error || "No se pudo crear la cuenta.");
      return;
    }

    alert("Cuenta creada. Ahora inicia sesión.");
    window.location.href = "/login";
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F7F8] px-6 text-[#111111]">
      <div className="w-full max-w-md rounded-[2rem] border border-[#E5E7EB] bg-white p-8 shadow-xl shadow-black/5">
        <div className="mb-8 text-center">
          <div className="text-2xl font-medium tracking-tight">ALMA</div>
          <div className="text-xs text-[#6B7280]">Powered by SEAINT</div>
        </div>

        <h1 className="mb-2 text-2xl font-medium tracking-tight">Crear tu ALMA</h1>
        <p className="mb-8 text-sm text-[#6B7280]">Beta privada.</p>

        <form onSubmit={signup} className="space-y-4">
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-xl border border-[#E5E7EB] px-4 py-3 outline-none focus:border-[#2563EB]" placeholder="Nombre completo" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-[#E5E7EB] px-4 py-3 outline-none focus:border-[#2563EB]" placeholder="Correo electrónico" type="email" required />
          <input value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-[#E5E7EB] px-4 py-3 outline-none focus:border-[#2563EB]" placeholder="Contraseña" type="password" required />
          <button disabled={loading} className="w-full rounded-xl bg-[#2563EB] py-3 font-medium text-white disabled:opacity-50">
            {loading ? "Creando..." : "Crear cuenta"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#6B7280]">
          ¿Ya tienes cuenta? <a href="/login" className="text-black">Inicia sesión</a>
        </p>
      </div>
    </main>
  );
}
