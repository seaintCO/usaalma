"use client";

import { useState } from "react";
import { ArrowRight, Download, MonitorPlay, Rocket, Sparkles } from "lucide-react";

export default function LaunchStudioPage() {
  const [prompt, setPrompt] = useState("");
  const [demo, setDemo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    const res = await fetch("/api/launch-studio/generate", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ prompt })
    });

    const data = await res.json();
    setDemo(data.demo);
    setLoading(false);
  }

  async function exportHtml() {
    if (!demo) return;

    const res = await fetch("/api/launch-studio/export", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ demo })
    });

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${demo.slug || "alma-demo"}.html`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  const hero = demo?.sections?.find((s:any)=>s.type === "hero");
  const table = demo?.sections?.find((s:any)=>s.type === "mock_dashboard");
  const features = demo?.sections?.find((s:any)=>s.type === "features");
  const stats = demo?.sections?.find((s:any)=>s.type === "stats");

  return (
    <main className="min-h-screen overflow-hidden bg-[#02040a] text-white">
      <div className="fixed inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.045)_1px,transparent_1px)] bg-[size:64px_64px]" />
      <div className="fixed left-1/2 top-0 h-[720px] w-[720px] -translate-x-1/2 rounded-full bg-blue-500/20 blur-[140px]" />

      <section className="relative z-10 mx-auto max-w-7xl px-6 py-8">
        <nav className="mb-12 flex items-center justify-between rounded-[1.75rem] border border-white/10 bg-white/[0.045] px-6 py-4 shadow-2xl backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-500/20 text-blue-300">
              <Rocket size={20} />
            </div>
            <div>
              <p className="font-bold tracking-tight">ALMA Launch Studio</p>
              <p className="text-xs text-white/40">Prompt to live demo</p>
            </div>
          </div>

          <div className="hidden items-center gap-8 text-sm text-white/55 md:flex">
            <span>Demos</span>
            <span>Portfolios</span>
            <span>Pitch Shells</span>
            <span>Export HTML</span>
          </div>

          <button className="rounded-full bg-white px-5 py-2 text-sm font-bold text-black">
            Paid Feature
          </button>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="lg:sticky lg:top-8 lg:h-fit">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-sm text-blue-200">
              <Sparkles size={16} />
              Aura-style demo generation for ALMA
            </div>

            <h1 className="max-w-3xl text-6xl font-semibold leading-[0.92] tracking-[-0.075em] md:text-7xl">
              Prompt to{" "}
              <span className="bg-gradient-to-r from-blue-300 via-cyan-200 to-white bg-clip-text text-transparent">
                live demo.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-white/55">
              Generate futuristic SaaS mockups, business shells, pitch pages, and client-ready demos.
              Export as index.html and launch on Vercel.
            </p>

            <div className="mt-8 rounded-[2rem] border border-white/10 bg-black/45 p-3 shadow-2xl backdrop-blur-xl">
              <textarea
                value={prompt}
                onChange={(e)=>setPrompt(e.target.value)}
                placeholder="Example: Create a futuristic SaaS trading community demo with live signal table, performance dashboard, pricing, and join CTA..."
                className="h-44 w-full resize-none rounded-[1.5rem] bg-white/[0.035] p-5 text-white outline-none placeholder:text-white/30"
              />

              <div className="flex flex-wrap justify-end gap-3">
                <button
                  onClick={generate}
                  disabled={loading || !prompt.trim()}
                  className="inline-flex items-center gap-2 rounded-full bg-blue-500 px-6 py-3 font-bold shadow-[0_0_45px_rgba(59,130,246,.45)] transition hover:scale-[1.02] disabled:opacity-40"
                >
                  {loading ? "Generating..." : "Generate Demo"}
                  <ArrowRight size={18} />
                </button>

                <button
                  onClick={exportHtml}
                  disabled={!demo}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-6 py-3 font-bold text-white transition hover:scale-[1.02] disabled:opacity-40"
                >
                  Export index.html
                  <Download size={18} />
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-blue-400/20 bg-[#050b18]/90 p-5 shadow-[0_0_90px_rgba(37,99,235,.28)] backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-white/70">
                <MonitorPlay size={16} />
                LIVE DEMO PREVIEW
              </div>
              <span className="text-xs tracking-[0.3em] text-cyan-300">SYS.STATUS: ONLINE</span>
            </div>

            <div className="overflow-hidden rounded-3xl border border-white/10 bg-black">
              <div className="border-b border-white/10 bg-white/[0.04] px-5 py-4">
                <div className="flex items-center justify-between">
                  <strong>{demo?.title || "Your Generated Demo"}</strong>
                  <button className="rounded-full bg-white px-4 py-2 text-xs font-bold text-black">Launch</button>
                </div>
              </div>

              <div className="p-8">
                <p className="mb-4 text-xs font-bold tracking-[0.25em] text-blue-300">
                  {hero?.eyebrow || "AI GENERATED LIVE DEMO"}
                </p>

                <h2 className="max-w-4xl text-5xl font-semibold leading-[0.95] tracking-[-0.06em] md:text-6xl">
                  {hero?.headline || "Your premium demo appears here."}
                </h2>

                <p className="mt-5 max-w-xl text-white/50">
                  {hero?.subheadline || "Write a prompt and ALMA will turn it into a futuristic pitch-ready experience."}
                </p>

                <div className="mt-8 flex gap-4">
                  <button className="rounded-full bg-blue-500 px-6 py-3 font-bold">Launch Demo</button>
                  <button className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 font-bold">View Mockup</button>
                </div>

                <div className="mt-12 rounded-3xl border border-blue-400/20 bg-blue-950/20">
                  <div className="flex justify-between border-b border-white/10 p-4 text-xs font-bold tracking-widest text-white/40">
                    <span>{table?.title || "Live Product Preview"}</span>
                    <span className="text-cyan-300">ONLINE</span>
                  </div>

                  {(table?.rows || [
                    ["ALMA OS", "AI Platform", "Active", "+42%"],
                    ["Launch Studio", "Demo Builder", "Beta", "+88%"],
                    ["CRM Memory", "Business Data", "Live", "+21%"],
                    ["Vercel Export", "Static HTML", "Ready", "+100%"]
                  ]).map((row:any, i:number)=>(
                    <div key={i} className="grid grid-cols-4 border-b border-white/5 p-4 text-sm">
                      <strong>{row[0]}</strong>
                      <span className="text-white/50">{row[1]}</span>
                      <span className="text-blue-300">{row[2]}</span>
                      <span className="text-emerald-300">{row[3]}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-8 grid gap-4 md:grid-cols-3">
                  {(features?.cards || [
                    { title:"Demo Shells", description:"Create a premium product illusion before the product exists." },
                    { title:"Business Portfolios", description:"Generate polished company profiles for clients." },
                    { title:"Investor Pages", description:"Turn ideas into pitch-ready narratives." }
                  ]).slice(0,3).map((card:any, i:number)=>(
                    <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
                      <h3 className="font-bold">{card.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-white/50">{card.description}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-8 grid gap-4 md:grid-cols-4">
                  {(stats?.stats || [
                    ["Build Time", "3 min"],
                    ["Export", "index.html"],
                    ["Design", "React Style"],
                    ["Deploy", "Vercel Ready"]
                  ]).map((stat:any, i:number)=>(
                    <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <p className="text-xs uppercase tracking-widest text-white/40">{stat[0]}</p>
                      <p className="mt-2 text-2xl font-bold">{stat[1]}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}