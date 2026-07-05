"use client";

import { useState } from "react";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function signup(e:React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/auth/signup", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ fullName, email, password })
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      alert(data.error || "No se pudo crear la cuenta.");
      return;
    }

    window.location.href = "/login?created=1";
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F7F8] px-5 text-black">
      <div className="w-full max-w-md rounded-[2rem] border border-[#E5E7EB] bg-white p-8 shadow-2xl shadow-black/10">
        <div className="text-center">
          <h1 className="text-3xl font-normal tracking-tight">ALMA</h1>
          <p className="mt-1 text-xs text-[#6B7280]">Powered by SEAINT</p>
        </div>

        <div className="mt-8">
          <h2 className="text-3xl font-normal tracking-tight">Crear tu ALMA</h2>
          <p className="mt-3 text-sm text-[#6B7280]">Beta privada.</p>
        </div>

        <form onSubmit={signup} className="mt-8 space-y-4" autoComplete="on">
          <input
            value={fullName}
            onChange={(e)=>setFullName(e.target.value)}
            placeholder="Nombre completo"
            autoComplete="name"
            className="w-full rounded-2xl border border-[#E5E7EB] bg-white px-5 py-4 text-base outline-none focus:border-black"
          />

          <input
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            placeholder="Correo electrónico"
            className="w-full rounded-2xl border border-[#E5E7EB] bg-white px-5 py-4 text-base outline-none focus:border-black"
          />

          <input
            value={password}
            onChange={(e)=>setPassword(e.target.value)}
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="Contraseña"
            className="w-full rounded-2xl border border-[#E5E7EB] bg-white px-5 py-4 text-base outline-none focus:border-black"
          />

          <button disabled={loading} className="w-full rounded-2xl bg-black py-4 text-base font-medium text-white disabled:opacity-50">
            {loading ? "Creando..." : "Crear cuenta"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-[#6B7280]">
          ¿Ya tienes cuenta? <a href="/login" className="font-medium text-black">Inicia sesión</a>
        </p>
      </div>
    </main>
  );
}
