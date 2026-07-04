"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function reset(e:React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo:`${window.location.origin}/auth/update-password`,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    setSent(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F7F8] px-6 text-black">
      <div className="w-full max-w-md rounded-[2rem] border border-[#E5E7EB] bg-white p-8 shadow-xl shadow-black/5">
        <h1 className="text-2xl font-medium tracking-tight">Reset password</h1>
        <p className="mt-2 text-sm text-[#6B7280]">Enter your email and ALMA will send you a reset link.</p>

        {sent ? (
          <div className="mt-8 rounded-2xl bg-[#F7F7F8] p-5 text-sm text-[#6B7280]">
            Check your email for the reset link.
          </div>
        ) : (
          <form onSubmit={reset} className="mt-8 space-y-4">
            <input value={email} onChange={(e)=>setEmail(e.target.value)} type="email" required placeholder="Email address" className="w-full rounded-xl border border-[#E5E7EB] px-4 py-3 outline-none focus:border-black" />
            <button disabled={loading} className="w-full rounded-xl bg-black py-3 font-medium text-white disabled:opacity-50">
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>
        )}

        <a href="/login" className="mt-6 block text-center text-sm text-[#6B7280] hover:text-black">Back to login</a>
      </div>
    </main>
  );
}
