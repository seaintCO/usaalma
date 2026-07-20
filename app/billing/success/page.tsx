"use client";
import { useEffect, useState } from "react";
import AuthLocaleToggle from "@/components/auth/AuthLocaleToggle";
import { authMessages } from "@/lib/i18n/messages";
import { useAlmaLocale } from "@/lib/i18n/useAlmaLocale";

export default function BillingSuccessPage() {
  const { locale } = useAlmaLocale();
  const text = authMessages[locale];
  const [status, setStatus] = useState<"syncing" | "ready" | "delayed">(
    "syncing",
  );
  useEffect(() => {
    let attempts = 0;
    let timer: number | undefined;
    async function check() {
      attempts += 1;
      try {
        const response = await fetch("/api/billing/status", {
          cache: "no-store",
        });
        const data = await response.json();
        if (
          response.ok &&
          ["active", "trialing"].includes(data.subscription?.status)
        ) {
          setStatus("ready");
          timer = window.setTimeout(
            () => window.location.assign("/dashboard"),
            900,
          );
          return;
        }
      } catch {}
      if (attempts > 12) return setStatus("delayed");
      timer = window.setTimeout(check, 1500);
    }
    void check();
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, []);
  const message =
    status === "ready"
      ? text.billingReady
      : status === "delayed"
        ? text.billingDelayed
        : text.billingSyncing;
  return (
    <main className="grid min-h-screen place-items-center bg-[#F7F7F8] px-6">
      <div className="w-full max-w-md rounded-[2rem] border border-[#E5E7EB] bg-white p-8 text-center shadow-xl shadow-black/5">
        <AuthLocaleToggle />
        <div className="mx-auto mb-5 mt-6 h-12 w-12 animate-pulse rounded-2xl bg-black" />
        <h1 className="text-2xl font-medium tracking-tight">
          {text.billingWelcome}
        </h1>
        <p role="status" className="mt-3 text-sm leading-6 text-[#6B7280]">
          {message}
        </p>
      </div>
    </main>
  );
}
