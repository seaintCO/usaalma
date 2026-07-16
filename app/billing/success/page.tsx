"use client";

import { useEffect, useState } from "react";

export default function BillingSuccessPage() {
  const [message, setMessage] = useState("Setting up your ALMA workspace...");

  useEffect(() => {
    let attempts = 0;

    async function check() {
      attempts++;

      const res = await fetch("/api/billing/status", { cache: "no-store" });
      const data = await res.json();

      if (["active", "trialing"].includes(data.subscription?.status)) {
        setMessage("Your ALMA workspace is ready.");
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 900);
        return;
      }

      if (attempts > 12) {
        setMessage(
          "Payment received. ALMA is still syncing your access. Refresh in a moment.",
        );
        return;
      }

      setTimeout(check, 1500);
    }

    check();
  }, []);

  return (
    <main className="grid min-h-screen place-items-center bg-[#F7F7F8] px-6">
      <div className="w-full max-w-md rounded-[2rem] border border-[#E5E7EB] bg-white p-8 text-center shadow-xl shadow-black/5">
        <div className="mx-auto mb-5 h-12 w-12 animate-pulse rounded-2xl bg-black" />
        <h1 className="text-2xl font-medium tracking-tight">Welcome to ALMA</h1>
        <p className="mt-3 text-sm text-[#6B7280]">{message}</p>
      </div>
    </main>
  );
}
