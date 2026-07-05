"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(e:React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.href = "/dashboard";
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F7F8] px-5 text-black">
      <div className="w-full max-w-md rounded-[2rem] border border-[#E5E7EB] bg-white p-8 shadow-2xl shadow-black/10">
        <div className="text-center">
          <h1 className="text-4xl font-normal tracking-tight">ALMA</h1>
          <p className="mt-1 text-sm text-[#6B7280]">Powered by SEAINT</p>
        </div>

        <div className="mt-10">
          <h2 className="text-4xl font-normal tracking-tight">Iniciar sesión</h2>
          <p className="mt-3 text-lg leading-8 text-[#6B7280]">
            Entra a tu sistema operativo personal y empresarial.
          </p>
        </div>

        <form onSubmit={login} className="mt-8 space-y-4" autoComplete="on">
          <input
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            placeholder="Correo electrónico"
            className="w-full rounded-2xl border border-[#E5E7EB] bg-white px-5 py-4 text-lg outline-none focus:border-black"
          />

          <input
            value={password}
            onChange={(e)=>setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            required
            placeholder="Contraseña"
            className="w-full rounded-2xl border border-[#E5E7EB] bg-white px-5 py-4 text-lg outline-none focus:border-black"
          />

          <button disabled={loading} className="w-full rounded-2xl bg-black py-4 text-lg font-medium text-white disabled:opacity-50">
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="mt-8 flex items-center justify-between text-sm text-[#6B7280]">
          <a href="/forgot-password" className="hover:text-black">Olvidé mi contraseña</a>
          <a href="/signup" className="hover:text-black">Crear cuenta</a>
        </div>
      </div>
    </main>
  );
}
