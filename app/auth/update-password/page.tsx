"use client";
import Link from "next/link";
import { useState } from "react";
import AuthLocaleToggle from "@/components/auth/AuthLocaleToggle";
import { authMessages } from "@/lib/i18n/messages";
import { useAlmaLocale } from "@/lib/i18n/useAlmaLocale";
import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const { locale } = useAlmaLocale();
  const text = authMessages[locale];
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [updated, setUpdated] = useState(false);
  async function update(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    const result = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (result.error) return setError(text.updateFailed);
    setUpdated(true);
  }
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F7F8] px-6 text-black">
      <div className="w-full max-w-md rounded-[2rem] border border-[#E5E7EB] bg-white p-8 shadow-xl shadow-black/5">
        <AuthLocaleToggle />
        <h1 className="mt-7 text-2xl font-medium tracking-tight">
          {text.updateTitle}
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#6B7280]">
          {text.updateSubtitle}
        </p>
        {updated ? (
          <div className="mt-7">
            <p
              role="status"
              className="rounded-xl bg-teal-50 p-4 text-sm text-teal-800"
            >
              {text.updateSuccess}
            </p>
            <Link
              href="/login"
              className="mt-4 block text-center text-sm font-medium"
            >
              {text.signIn}
            </Link>
          </div>
        ) : (
          <form onSubmit={update} className="mt-8 space-y-4">
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              minLength={8}
              required
              placeholder={text.newPassword}
              aria-label={text.newPassword}
              autoComplete="new-password"
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
              {loading ? text.updating : text.updatePassword}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
