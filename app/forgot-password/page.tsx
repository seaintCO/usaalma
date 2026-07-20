"use client";
import Link from "next/link";
import { useState } from "react";
import AuthLocaleToggle from "@/components/auth/AuthLocaleToggle";
import { authMessages } from "@/lib/i18n/messages";
import { useAlmaLocale } from "@/lib/i18n/useAlmaLocale";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const { locale } = useAlmaLocale();
  const text = authMessages[locale];
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function reset(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    const result = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });
    setLoading(false);
    if (result.error) return setError(text.resetFailed);
    setSent(true);
  }
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F7F8] px-6 text-black">
      <div className="w-full max-w-md rounded-[2rem] border border-[#E5E7EB] bg-white p-8 shadow-xl shadow-black/5">
        <AuthLocaleToggle />
        <h1 className="mt-7 text-2xl font-medium tracking-tight">
          {text.resetTitle}
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#6B7280]">
          {text.resetSubtitle}
        </p>
        {sent ? (
          <div
            role="status"
            className="mt-8 rounded-2xl bg-teal-50 p-5 text-sm text-teal-800"
          >
            {text.resetSent}
          </div>
        ) : (
          <form onSubmit={reset} className="mt-8 space-y-4">
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              required
              placeholder={text.email}
              aria-label={text.email}
              autoComplete="email"
              className="w-full rounded-xl border border-[#D1D5DB] px-4 py-3 outline-none focus:border-black"
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
              className="w-full rounded-xl bg-black py-3 font-medium text-white disabled:opacity-50"
            >
              {loading ? text.sending : text.sendReset}
            </button>
          </form>
        )}
        <Link
          href="/login"
          className="mt-6 block text-center text-sm text-[#6B7280] hover:text-black"
        >
          {text.backToLogin}
        </Link>
      </div>
    </main>
  );
}
