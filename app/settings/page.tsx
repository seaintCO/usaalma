"use client";

import { Mail, Plug, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";

function LanguageSelector() {
  const [preferredLanguage, setPreferredLanguage] = require("react").useState("auto");

  require("react").useEffect(() => {
    fetch("/api/settings/language")
      .then((res:any)=>res.json())
      .then((data:any)=>setPreferredLanguage(data.language || "auto"));
  }, []);

  async function save(language:string) {
    setPreferredLanguage(language);
    await fetch("/api/settings/language", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ language })
    });
  }

  return (
    <div className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <h2 className="text-lg font-medium">Language / Idioma</h2>
      <p className="mt-1 text-sm text-[#6B7280]">Choose how ALMA displays pages.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {[
          ["auto","Auto"],
          ["en","English"],
          ["es","Espaol"]
        ].map(([id,label])=>(
          <button
            key={id}
            onClick={()=>save(id)}
            className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
              preferredLanguage === id ? "border-black bg-black text-white" : "border-[#E5E7EB] bg-[#F7F7F8] text-[#6B7280]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function AlmaModeSelector() {
  const React = require("react");
  const [mode, setMode] = React.useState("auto");

  React.useEffect(() => {
    fetch("/api/settings/alma-mode")
      .then((res:any)=>res.json())
      .then((data:any)=>setMode(data.mode || "auto"));
  }, []);

  async function save(nextMode:string) {
    setMode(nextMode);
    await fetch("/api/settings/alma-mode", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ mode:nextMode })
    });
  }

  return (
    <div className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <h2 className="text-lg font-medium">ALMA Intelligence</h2>
      <p className="mt-1 text-sm text-[#6B7280]">Choose how ALMA thinks. Auto is recommended.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {[
          ["auto","Auto"],
          ["fast","Fast"],
          ["deep","Deep Thinking"]
        ].map(([id,label])=>(
          <button
            key={id}
            onClick={()=>save(id)}
            className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
              mode === id ? "border-black bg-black text-white" : "border-[#E5E7EB] bg-[#F7F7F8] text-[#6B7280]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [connections, setConnections] = useState<any[]>([]);
  const [showGmailModal, setShowGmailModal] = useState(false);

  async function loadConnections() {
    const res = await fetch("/api/oauth/list");
    const data = await res.json();
    if (Array.isArray(data)) setConnections(data);
  }

  function connectGoogle() {
    setShowGmailModal(true);
  }

  useEffect(() => {
    loadConnections();
  }, []);

  const googleConnected = connections.some(
    (c) => c.provider === "google" && (c.connected || c.access_token)
  );

  return (
    <main className="min-h-screen bg-[#F7F7F8] px-4 py-8 text-[#111111] md:px-6 md:py-10">
      <div className="mx-auto max-w-5xl">
        <a href="/dashboard" className="text-sm text-[#6B7280] hover:text-black">
           Volver a ALMA
        </a>

        <div className="mt-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white">
            <Plug className="h-5 w-5" />
          </div>

          <h1 className="text-4xl font-medium tracking-tight md:text-5xl">
            Settings
          </h1>

          <p className="mt-4 max-w-2xl text-lg text-[#6B7280]">
            Connect your tools so ALMA can help you across your business.
          </p>
        </div>

        <div className="mt-10 rounded-[2rem] border border-[#E5E7EB] bg-white p-6">
          <h2 className="text-2xl font-medium">Integrations</h2>

          <div className="mt-6 grid gap-4">
            <div className="flex flex-col gap-4 rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] p-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white">
                  <Mail className="h-5 w-5" />
                </div>

                <div>
                  <div className="font-medium">Gmail</div>
                  <div className="text-sm text-[#6B7280]">
                    Summarize emails, create drafts, and send messages.
                  </div>
                </div>
              </div>

              <button
                onClick={connectGoogle}
                className={
                  googleConnected
                    ? "rounded-full bg-green-50 px-5 py-3 text-sm font-medium text-green-700"
                    : "rounded-full bg-black px-5 py-3 text-sm font-medium text-white"
                }
              >
                {googleConnected ? "Connected" : "Connect Gmail"}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-[2rem] border border-[#E5E7EB] bg-white p-6">
          <h2 className="text-2xl font-medium">Privacy</h2>
          <div className="mt-4 flex gap-3 text-sm leading-6 text-[#6B7280]">
            <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-green-600" />
            <p>
              ALMA only uses connected account data to complete actions you request,
              like summarizing Gmail or drafting replies.
            </p>
          </div>
        </div>
      </div>

      {showGmailModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 md:items-center">
          <div className="w-full max-w-xl rounded-[2rem] bg-[#1f1f1f] p-6 text-white shadow-2xl">
            <button
              onClick={() => setShowGmailModal(false)}
              className="ml-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mt-4 text-center">
              <div className="mx-auto mb-6 flex items-center justify-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-black text-3xl font-bold">
                  A
                </div>
                <div className="text-2xl text-white/50"></div>
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-3xl font-bold text-black">
                  G
                </div>
              </div>

              <h2 className="text-3xl font-semibold">Connect Gmail</h2>

              <div className="mt-8 rounded-2xl border border-white/20 p-5 text-left text-sm leading-6 text-white/70">
                <p>
                  <strong className="text-white">This page will redirect to Google.</strong>{" "}
                  You will sign in and confirm permissions on Googles page.
                </p>

                <p className="mt-4">
                  <strong className="text-white">Private and secure.</strong>{" "}
                  ALMA uses Gmail access only to summarize, draft, and send emails you request.
                </p>

                <p className="mt-4">
                  <strong className="text-white">You are in control.</strong>{" "}
                  You can disconnect Gmail anytime from Settings or your Google account.
                </p>
              </div>

              <button
                onClick={() => (window.location.href = "/api/oauth/google/start")}
                className="mt-8 w-full rounded-full bg-white py-4 text-lg font-semibold text-black"
              >
                Continue to Google
              </button>
            </div>
          </div>
        </div>
      )}
          <div className="mx-auto mt-6 max-w-3xl"><LanguageSelector /></div>`r`n    </main>
  );
}

