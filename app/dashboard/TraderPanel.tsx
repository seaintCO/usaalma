"use client";

import { useEffect, useRef, useState } from "react";
import { Brain, CalendarDays, CheckCircle2, Download, GraduationCap, Plus, Sparkles, TrendingUp, Upload } from "lucide-react";

const defaultSymbols = ["SPY", "QQQ", "NVDA", "TSLA", "AAPL", "META", "BTCUSD"];

const starterQuestion =
  "Analyze this chart like an elite trader. Give me bias, key levels, calls/puts plan, invalidation, risk, and what I should wait for. Educational only.";

export default function TraderPanel() {
  const [symbol, setSymbol] = useState("SPY");
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [journal, setJournal] = useState<any[]>([]);
  const [question, setQuestion] = useState(starterQuestion);
  const [coachQuestion, setCoachQuestion] = useState("");
  const [coachAnswer, setCoachAnswer] = useState("");
  const [chartFile, setChartFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function load() {
    const j = await fetch("/api/trader/journal").then((r)=>r.json());
    const w = await fetch("/api/trader/watchlist").then((r)=>r.json());
    setJournal(j.journal || []);
    setWatchlist(w.watchlist || []);
  }

  async function addWatchlist(s = symbol) {
    await fetch("/api/trader/watchlist", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ symbol:s })
    });
    await load();
  }

  async function analyzeChart() {
    if (!chartFile) {
      alert("Upload a chart screenshot first.");
      return;
    }

    setAnalyzing(true);
    setAnalysis("");

    const form = new FormData();
    form.append("file", chartFile);
    form.append("question", `${question}\n\nSymbol: ${symbol}`);

    const res = await fetch("/api/trading/chart-analyze", {
      method:"POST",
      body:form
    });

    const data = await res.json();
    setAnalysis(data.answer || data.error || "ALMA could not analyze this chart.");
    setAnalyzing(false);
  }

  async function askCoach() {
    if (!coachQuestion.trim()) return;

    setCoachAnswer("ALMA Coach is thinking...");

    const res = await fetch("/api/chat/stream", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({
        message:`You are ALMA Trader Coach. Answer this trading education question clearly, no financial advice. Question: ${coachQuestion}`
      })
    });

    if (!res.body) return;

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let text = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      text += decoder.decode(value).replace(/\[CONVERSATION_ID:.*?\]\n/, "");
      setCoachAnswer(text);
    }
  }

  async function saveAnalysis() {
    if (!analysis) return;

    await fetch("/api/trader/journal", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({
        symbol,
        direction:"Analysis",
        setup:"Chart Review",
        notes:analysis,
        confidence:82
      })
    });

    await load();
    alert("Saved to journal.");
  }

  function downloadPdf() {
    if (!analysis) return;

    const html = `
      <html>
        <head>
          <title>ALMA Trader Analysis</title>
          <style>
            body{font-family:Arial;padding:40px;line-height:1.6}
            h1{font-size:28px}
            pre{white-space:pre-wrap;font-family:Arial}
          </style>
        </head>
        <body>
          <h1>ALMA Trader Analysis - ${symbol}</h1>
          <p>Educational only. Not financial advice.</p>
          <pre>${analysis.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</pre>
        </body>
      </html>
    `;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.print();
  }

  useEffect(()=>{ load(); }, []);

  return (
    <div className="h-full overflow-y-auto bg-[#F6F7F9] px-4 py-5 text-black md:px-8 md:py-8">
      <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-sm md:p-8">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-[#9CA3AF]">ALMA Trader OS</p>

        <div className="mt-4 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <h1 className="text-4xl font-normal tracking-tight md:text-7xl">Trade with memory.</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#6B7280] md:text-lg">
              Chart workspace, AI analysis, trading coach, journal calendar, and personal trading playbook.
            </p>
          </div>

          <div className="rounded-full bg-[#F7F7F8] px-5 py-3 text-sm font-medium text-[#6B7280]">Educational only. Not financial advice.</div>
        </div>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_430px]">
        <div className="space-y-5">
          <div className="overflow-hidden rounded-[2rem] border border-[#E5E7EB] bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-[#E5E7EB] p-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-black text-white">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#9CA3AF]">Active Chart</p>
                  <strong className="text-2xl">{symbol}</strong>
                </div>
              </div>

              <div className="flex gap-2">
                <select value={symbol} onChange={(e)=>setSymbol(e.target.value)} className="min-w-0 flex-1 rounded-full border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-3 text-sm md:min-w-40">
                  {[...defaultSymbols, ...watchlist.map((w)=>w.symbol)].filter(Boolean).map((s, i)=>(
                    <option key={i} value={s}>{s}</option>
                  ))}
                </select>

                <button onClick={()=>addWatchlist()} className="rounded-full bg-[#F7F7F8] px-4 py-3 text-sm font-medium">
                  + Watch
                </button>
              </div>
            </div>

            <iframe
              title="TradingView Chart"
              className="h-[520px] w-full border-0 md:h-[720px]"
              src={`https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(symbol)}&interval=15&theme=light&style=1&hideideas=1&withdateranges=1&saveimage=1`}
            />
          </div>

          <div className="rounded-[2rem] border border-[#E5E7EB] bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                <h2 className="text-xl font-medium">AI Chart Analysis</h2>
              </div>

              <button onClick={()=>fileRef.current?.click()} className="rounded-full bg-black px-5 py-3 text-sm font-medium text-white">
                Upload Screenshot
              </button>
            </div>

            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e)=>setChartFile(e.target.files?.[0] || null)} />

            <div className="mt-4 rounded-2xl border border-dashed border-[#D1D5DB] bg-[#F7F7F8] p-4 text-sm text-[#6B7280]">
              {chartFile ? chartFile.name : "Upload TradingView, Webull, Robinhood, Thinkorswim, Binance, or broker chart screenshot."}
            </div>

            <textarea value={question} onChange={(e)=>setQuestion(e.target.value)} className="mt-3 min-h-24 w-full resize-none rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] p-4 text-sm outline-none" />

            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={analyzeChart} disabled={analyzing || !chartFile} className="rounded-full bg-black px-5 py-3 text-sm font-medium text-white disabled:opacity-40">
                {analyzing ? "Analyzing..." : "Analyze Chart"}
              </button>

              <button onClick={saveAnalysis} disabled={!analysis} className="rounded-full bg-[#F7F7F8] px-5 py-3 text-sm font-medium disabled:opacity-40">
                Save to Journal
              </button>

              <button onClick={downloadPdf} disabled={!analysis} className="inline-flex items-center gap-2 rounded-full bg-[#F7F7F8] px-5 py-3 text-sm font-medium disabled:opacity-40">
                <Download className="h-4 w-4" />
                Download PDF
              </button>
            </div>

            <div className="mt-4 min-h-48 rounded-3xl bg-[#F7F7F8] p-5 text-sm leading-7 whitespace-pre-wrap">
              {analyzing ? "ALMA is checking bias, liquidity, VWAP/EMA, calls/puts scenarios, invalidation, and risk..." : analysis || "Your analysis will appear here."}
            </div>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-[2rem] border border-[#E5E7EB] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              <h2 className="text-xl font-medium">ALMA Checklist</h2>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              {["Trend direction is clear", "VWAP/key level is respected", "Volume confirms the move", "Liquidity area is identified", "Entry, stop, target are defined"].map((item)=>(
                <div key={item} className="flex items-center gap-3 rounded-2xl bg-[#F7F7F8] p-4">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-[#E5E7EB] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              <h2 className="text-xl font-medium">Trading Coach</h2>
            </div>

            <textarea value={coachQuestion} onChange={(e)=>setCoachQuestion(e.target.value)} placeholder="Ask anything: What is VWAP? When do I look for puts? Explain liquidity sweep..." className="mt-4 min-h-24 w-full resize-none rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] p-4 text-sm outline-none" />

            <button onClick={askCoach} className="mt-3 rounded-full bg-black px-5 py-3 text-sm font-medium text-white">
              Ask Coach
            </button>

            <div className="mt-4 min-h-32 rounded-2xl bg-[#F7F7F8] p-4 text-sm leading-7 whitespace-pre-wrap text-[#111827]">
              {coachAnswer || "ALMA can teach concepts, explain setups, and help you understand what to wait for."}
            </div>
          </div>

          <div className="rounded-[2rem] border border-[#E5E7EB] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              <h2 className="text-xl font-medium">Journal Calendar</h2>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-2 text-center text-xs">
              {Array.from({ length: 30 }).map((_, i)=>(
                <div key={i} className={`rounded-xl p-2 ${journal[i] ? "bg-black text-white" : "bg-[#F7F7F8] text-[#6B7280]"}`}>
                  {i + 1}
                </div>
              ))}
            </div>

            <a href="/planner" className="mt-4 block rounded-full bg-[#F7F7F8] px-5 py-3 text-center text-sm font-medium">
              Open Planner Calendar
            </a>
          </div>
        </aside>
      </section>
    </div>
  );
}
