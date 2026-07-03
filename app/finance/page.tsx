"use client";

import { useEffect, useRef, useState } from "react";
import TradingViewWidget from "@/components/finance/TradingViewWidget";
import { Camera, ImageUp, Sparkles, TrendingUp } from "lucide-react";

function cleanText(text:string) {
  return text
    .replace(/^#{1,6}\s?/gm, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/---/g, "")
    .trim();
}

export default function MarketAnalystPage() {
  const [symbol, setSymbol] = useState("NASDAQ:AAPL");
  const [question, setQuestion] = useState("Analyze this chart. Where should I look for calls or puts?");
  const [answer, setAnswer] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const uploadRef = useRef<HTMLInputElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);

  function selectFile(selected:File | undefined) {
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setAnswer("");
  }

  async function analyzeChart() {
    if (!file) {
      setAnswer("Upload a chart screenshot first.");
      return;
    }

    setLoading(true);
    setAnswer("");

    const form = new FormData();
    form.append("file", file);
    form.append("question", question);

    const res = await fetch("/api/trading/chart-analyze", {
      method:"POST",
      body:form
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
            <h1 className="text-4xl font-medium tracking-tight md:text-5xl">ALMA Markets</h1>
            <p className="mt-3 max-w-2xl text-[#6B7280]">
              Open the live TradingView chart, upload a screenshot, and let ALMA analyze calls, puts, liquidity, structure, and key levels.
            </p>
          </div>

          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="rounded-full border border-[#E5E7EB] bg-white px-4 py-3 outline-none"
            placeholder="NASDAQ:AAPL"
          />
        </div>

        <div className="mt-8">
          <TradingViewWidget symbol={symbol} />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[420px_1fr]">
          <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <h2 className="font-medium">Upload Chart Screenshot</h2>
            </div>

            <p className="mb-5 text-sm leading-6 text-[#6B7280]">
              Upload a TradingView, Webull, Thinkorswim, Robinhood, Binance, or broker chart screenshot. ALMA will analyze what is visible.
            </p>

            <input
              ref={uploadRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => selectFile(e.target.files?.[0])}
            />

            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => selectFile(e.target.files?.[0])}
            />

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => uploadRef.current?.click()}
                className="flex items-center justify-center gap-2 rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-4 text-sm font-medium hover:bg-white"
              >
                <ImageUp className="h-4 w-4" />
                Upload
              </button>

              <button
                onClick={() => cameraRef.current?.click()}
                className="flex items-center justify-center gap-2 rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-4 text-sm font-medium hover:bg-white"
              >
                <Camera className="h-4 w-4" />
                Camera
              </button>
            </div>

            {preview && (
              <div className="mt-5 overflow-hidden rounded-2xl border border-[#E5E7EB]">
                <img src={preview} alt="Chart preview" className="w-full object-cover" />
              </div>
            )}

            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="mt-5 min-h-28 w-full rounded-2xl bg-[#F7F7F8] p-4 text-sm outline-none"
            />

            <button
              onClick={analyzeChart}
              disabled={loading}
              className="mt-4 w-full rounded-2xl bg-black px-5 py-4 text-sm font-medium text-white disabled:opacity-50"
            >
              {loading ? "Analyzing chart..." : "Analyze Screenshot"}
            </button>
          </section>

          <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <h2 className="font-medium">ALMA Market Analysis</h2>
            </div>

            {!answer ? (
              <div className="flex min-h-[360px] items-center justify-center rounded-3xl bg-[#F7F7F8] p-8 text-center text-[#6B7280]">
                Upload a TradingView, Webull, Thinkorswim, Robinhood, Binance, or broker chart screenshot. ALMA will provide educational market analysis. Not financial advice.
              </div>
            ) : (
              <div className="whitespace-pre-wrap rounded-3xl bg-[#F7F7F8] p-6 text-sm leading-7 text-[#111111]">
                {cleanText(answer)}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
