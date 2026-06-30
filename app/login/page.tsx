"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      alert(error.message);
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect") || "/dashboard";

    window.location.href = redirect;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F7F8] px-6 text-[#111111]">
      <div className="w-full max-w-md rounded-[2rem] border border-[#E5E7EB] bg-white p-8 shadow-xl shadow-black/5">
        <div className="mb-8 text-center">
          <div className="text-2xl font-medium tracking-tight">ALMA</div>
          <div className="text-xs text-[#6B7280]">Powered by SEAINT</div>
        </div>

        <h1 className="mb-2 text-2xl font-medium tracking-tight">Iniciar sesión</h1>
        <p className="mb-8 text-sm text-[#6B7280]">
          Entra a tu sistema operativo personal y empresarial.
        </p>

        <form onSubmit={login} className="space-y-4">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-[#E5E7EB] px-4 py-3 outline-none focus:border-[#2563EB]"
            placeholder="Correo electrónico"
            type="email"
            required
          />

          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-[#E5E7EB] px-4 py-3 outline-none focus:border-[#2563EB]"
            placeholder="Contraseña"
            type="password"
            required
          />

          <button
            disabled={loading}
            className="w-full rounded-xl bg-black py-3 font-medium text-white disabled:opacity-50"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="mt-6 flex justify-between text-sm text-[#6B7280]">
          <a href="/forgot-password" className="hover:text-black">
            Olvidé mi contraseña
          </a>
          <a href="/signup" className="hover:text-black">
            Crear cuenta
          </a>
        </div>
      </div>
    </main>
  );
}
