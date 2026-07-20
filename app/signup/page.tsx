"use client";

import Link from "next/link";
import { useState } from "react";
import AuthLocaleToggle from "@/components/auth/AuthLocaleToggle";
import { authMessages } from "@/lib/i18n/messages";
import { useAlmaLocale } from "@/lib/i18n/useAlmaLocale";

export default function SignupPage() {
  const { locale } = useAlmaLocale();
  const text = authMessages[locale];
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function signup(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password }),
      });
      if (!response.ok) throw new Error();
      window.location.assign("/login?created=1");
    } catch {
      setError(text.signupFailed);
      setLoading(false);
    }
  }
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F7F8] px-5 text-black">
      <div className="w-full max-w-md rounded-[2rem] border border-[#E5E7EB] bg-white p-7 shadow-xl shadow-black/5 md:p-8">
        <AuthLocaleToggle />
        <div className="mt-5 text-center">
          <h1 className="text-3xl tracking-tight">ALMA</h1>
          <p className="mt-1 text-xs text-[#6B7280]">{text.poweredBy}</p>
        </div>
        <div className="mt-8">
          <h2 className="text-3xl tracking-tight">{text.signupTitle}</h2>
          <p className="mt-2 text-sm text-[#6B7280]">{text.privateBeta}</p>
        </div>
        <form onSubmit={signup} className="mt-7 space-y-4">
          <input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder={text.fullName}
            aria-label={text.fullName}
            autoComplete="name"
            className="w-full rounded-2xl border border-[#D1D5DB] px-4 py-3"
          />
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            required
            placeholder={text.email}
            aria-label={text.email}
            autoComplete="email"
            className="w-full rounded-2xl border border-[#D1D5DB] px-4 py-3"
          />
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            required
            minLength={8}
            placeholder={text.password}
            aria-label={text.password}
            autoComplete="new-password"
            className="w-full rounded-2xl border border-[#D1D5DB] px-4 py-3"
          />
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
            {loading ? text.creating : text.createAccount}
          </button>
        </form>
        <p className="mt-7 text-center text-sm text-[#6B7280]">
          {text.haveAccount}{" "}
          <Link href="/login" className="font-medium text-black">
            {text.signIn}
          </Link>
        </p>
      </div>
    </main>
  );
}
