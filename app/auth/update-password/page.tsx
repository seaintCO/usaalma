"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function update(e:React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Password updated. Please log in.");
    window.location.href = "/login";
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F7F8] px-6 text-black">
      <div className="w-full max-w-md rounded-[2rem] border border-[#E5E7EB] bg-white p-8 shadow-xl shadow-black/5">
        <h1 className="text-2xl font-medium tracking-tight">Create new password</h1>
        <p className="mt-2 text-sm text-[#6B7280]">Choose a new password for your ALMA account.</p>

        <form onSubmit={update} className="mt-8 space-y-4">
          <input value={password} onChange={(e)=>setPassword(e.target.value)} type="password" minLength={8} required placeholder="New password" className="w-full rounded-xl border border-[#E5E7EB] px-4 py-3 outline-none focus:border-black" />
          <button disabled={loading} className="w-full rounded-xl bg-black py-3 font-medium text-white disabled:opacity-50">
            {loading ? "Updating..." : "Update password"}
          </button>
        </form>
      </div>
    </main>
  );
}
