"use client";

import { useState } from "react";
import { Sparkles, Presentation, Lock } from "lucide-react";

export default function PresentationsPage() {
  const [prompt, setPrompt] = useState("");
  const [deck, setDeck] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setLoading(true);
    setError("");
    setDeck(null);

    const res = await fetch("/api/presentations/generate", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ prompt })
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Could not generate presentation.");
      setLoading(false);
      return;
    }

    setDeck(data.presentation.deck);
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#05070d] text-white px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur">
          <div className="mb-4 flex items-center gap-3 text-cyan-300">
            <Presentation />
            <span className="text-sm uppercase tracking-[0.3em]">ALMA Paid Feature</span>
          </div>

          <h1 className="text-5xl font-semibold tracking-tight">
            AI Presentation Builder
          </h1>

          <p className="mt-4 max-w-3xl text-white/60">
            Build premium pitch decks, business portfolios, sales presentations, investor decks,
            and personal portfolios from one prompt.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-[1fr_auto]">
            <textarea
              value={prompt}
              onChange={(e)=>setPrompt(e.target.value)}
              placeholder="Example: Create a premium investor deck for my AI business ALMA. Make it futuristic, Apple-level, and focused on growth."
              className="min-h-32 rounded-3xl border border-white/10 bg-black/40 p-5 text-white outline-none placeholder:text-white/30"
            />

            <button
              onClick={generate}
              disabled={loading || !prompt.trim()}
              className="rounded-3xl bg-cyan-300 px-8 py-4 font-semibold text-black transition hover:scale-[1.02] disabled:opacity-40"
            >
              {loading ? "Building..." : "Generate Deck"}
            </button>
          </div>

          {error && (
            <div className="mt-6 flex items-center gap-2 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-red-200">
              <Lock size={18} />
              {error}
            </div>
          )}
        </div>

        {deck && (
          <section className="grid gap-6">
            <div className="flex items-center gap-3">
              <Sparkles className="text-cyan-300" />
              <h2 className="text-2xl font-semibold">{deck.title}</h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {deck.slides?.map((slide:any, i:number)=>(
                <div
                  key={i}
                  className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.10] to-white/[0.02] p-8 shadow-xl"
                >
                  <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-cyan-300/20 blur-3xl" />
                  <div className="relative">
                    <p className="mb-8 text-sm text-cyan-200/70">
                      Slide {i + 1} · {slide.type}
                    </p>

                    <h3 className="text-3xl font-semibold tracking-tight">
                      {slide.headline}
                    </h3>

                    <p className="mt-3 text-white/60">
                      {slide.subheadline}
                    </p>

                    <ul className="mt-8 space-y-3">
                      {slide.bullets?.map((b:string, idx:number)=>(
                        <li key={idx} className="rounded-2xl border border-white/10 bg-black/30 p-4 text-white/80">
                          {b}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-8 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm text-cyan-100">
                      Visual: {slide.visual}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
