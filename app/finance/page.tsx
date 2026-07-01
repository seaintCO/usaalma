"use client";

import { useState } from "react";
import TradingViewWidget from "@/components/finance/TradingViewWidget";
import { Sparkles, TrendingUp } from "lucide-react";

export default function FinancePage() {
  const [symbol, setSymbol] = useState("NASDAQ:AAPL");
  const [question, setQuestion] = useState("Give me daily market analysis and key levels.");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  async function analyze() {
    setLoading(true);
    setAnswer("");

    const res = await fetch("/api/finance/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol, question })
    });

    const data = await res.json();
    setAnswer(data.answer || data.error || "No analysis available.");
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#F7F7F8] px-4 py-8 text-[#111111] md:px-8">
      <div className="mx-auto max-w-7xl">
        <a href="/dashboard" className="text-sm text-[#6B7280] hover:text-black">← Back to ALMA</a>

        <div className="mt-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-white">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h1 className="text-4xl font-medium tracking-tight md:text-5xl">ALMA Finance</h1>
            <p className="mt-3 text-[#6B7280]">TradingView charts + ALMA market analysis.</p>
          </div>

          <div className="flex gap-2">
            <input value={symbol} onChange={(e) => setSymbol(e.target.value)} className="rounded-full border border-[#E5E7EB] px-4 py-3 outline-none" />
            <button onClick={analyze} className="rounded-full bg-black px-5 py-3 text-white">
              Analyze
            </button>
          </div>
        </div>

        <div className="mt-8">
          <TradingViewWidget symbol={symbol} />
        </div>

        <div className="mt-6 rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 font-medium">
            <Sparkles className="h-4 w-4" />
            Ask ALMA
          </div>

          <textarea value={question} onChange={(e) => setQuestion(e.target.value)} className="min-h-24 w-full rounded-2xl bg-[#F7F7F8] p-4 outline-none" />

          <button onClick={analyze} disabled={loading} className="mt-4 rounded-full bg-black px-5 py-3 text-white disabled:opacity-50">
            {loading ? "Analyzing..." : "Generate Analysis"}
          </button>

          {answer && (
            <div className="mt-6 whitespace-pre-wrap rounded-2xl bg-[#F7F7F8] p-5 text-sm leading-6">
              {answer}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
