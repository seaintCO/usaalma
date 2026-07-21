"use client";

import Link from "next/link";
import { useState } from "react";
import AuthLocaleToggle from "@/components/auth/AuthLocaleToggle";
import { authMessages } from "@/lib/i18n/messages";
import { useAlmaLocale } from "@/lib/i18n/useAlmaLocale";
import { createClient } from "@/lib/supabase/client";
import {
  continuationQuery,
  loginContinuation,
} from "@/lib/billing/continuation";

export default function LoginPage() {
  const { locale } = useAlmaLocale();
  const text = authMessages[locale];
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function login(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    const result = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (result.error) return setError(text.loginFailed);
    window.location.assign(loginContinuation(window.location.search));
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F7F8] px-5 text-black">
      <div className="w-full max-w-md rounded-[2rem] border border-[#E5E7EB] bg-white p-7 shadow-xl shadow-black/5 md:p-8">
        <AuthLocaleToggle />
        <div className="mt-5 text-center">
          <h1 className="text-4xl font-normal tracking-tight">ALMA</h1>
          <p className="mt-1 text-sm text-[#6B7280]">{text.poweredBy}</p>
        </div>
        <div className="mt-8">
          <h2 className="text-3xl font-normal tracking-tight">
            {text.loginTitle}
          </h2>
          <p className="mt-3 text-base leading-7 text-[#6B7280]">
            {text.loginSubtitle}
          </p>
        </div>
        <form onSubmit={login} className="mt-7 space-y-4" autoComplete="on">
          <label className="block text-sm font-medium">
            <span>{text.email}</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              aria-label={text.email}
              className="mt-2 w-full rounded-2xl border border-[#D1D5DB] px-4 py-3 outline-none focus:border-black"
            />
          </label>
          <label className="block text-sm font-medium">
            <span>{text.password}</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
              required
              aria-label={text.password}
              className="mt-2 w-full rounded-2xl border border-[#D1D5DB] px-4 py-3 outline-none focus:border-black"
            />
          </label>
          {error ? (
            <p
              role="alert"
              className="rounded-xl bg-red-50 p-3 text-sm text-red-800"
            >
              {error}
            </p>
          ) : null}
          <button
            disabled={loading}
            className="w-full rounded-2xl bg-black py-3.5 font-medium text-white disabled:opacity-50"
          >
            {loading ? text.signingIn : text.signIn}
          </button>
        </form>
        <div className="mt-7 flex items-center justify-between gap-4 text-sm text-[#6B7280]">
          <Link href="/forgot-password" className="hover:text-black">
            {text.forgot}
          </Link>
          <Link
            href="/signup"
            onClick={(event) => {
              const query = continuationQuery(window.location.search);
              if (!query) return;
              event.preventDefault();
              window.location.assign(`/signup${query}`);
            }}
            className="hover:text-black"
          >
            {text.createAccount}
          </Link>
        </div>
      </div>
    </main>
  );
}
