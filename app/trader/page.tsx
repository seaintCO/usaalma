"use client";

import { useEffect, useState } from "react";
import { Activity, Brain, CheckCircle2, ClipboardList, Plus, Save, TrendingUp } from "lucide-react";

const defaultSymbols = ["SPY", "QQQ", "NVDA", "TSLA", "AAPL", "META", "BTCUSD"];

export default function TraderPage() {
  const [symbol, setSymbol] = useState("SPY");
  const [journal, setJournal] = useState<any[]>([]);
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [notes, setNotes] = useState("");
  const [direction, setDirection] = useState("Calls");
  const [setup, setSetup] = useState("VWAP Reclaim");
  const [entry, setEntry] = useState("");
  const [stop, setStop] = useState("");
  const [target, setTarget] = useState("");

  async function load() {
    const j = await fetch("/api/trader/journal").then((r)=>r.json());
    const w = await fetch("/api/trader/watchlist").then((r)=>r.json());
    setJournal(j.journal || []);
    setWatchlist(w.watchlist || []);
  }

  async function saveJournal() {
    await fetch("/api/trader/journal", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({
        symbol,
        direction,
        setup,
        entry,
        stop,
        target,
        notes,
        confidence:82
      })
    });

    setNotes("");
    await load();
  }

  async function addWatchlist(s = symbol) {
    await fetch("/api/trader/watchlist", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ symbol:s })
    });

    await load();
  }

  useEffect(()=>{ load(); }, []);

  return (
    <main className="min-h-screen bg-[#F7F7F8] px-4 py-6 text-black md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-[#9CA3AF]">ALMA Trader</p>
          <h1 className="mt-3 text-4xl font-normal tracking-tight md:text-6xl">Your AI trading operating system.</h1>
          <p className="mt-4 max-w-3xl text-[#6B7280]">
            Chart workspace, AI analyst, journal, watchlist, setup checklist, and trade memory.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <section className="overflow-hidden rounded-[2rem] border border-[#E5E7EB] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                <strong>{symbol}</strong>
              </div>

              <select
                value={symbol}
                onChange={(e)=>setSymbol(e.target.value)}
                className="rounded-full border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-2 text-sm"
              >
                {[...defaultSymbols, ...watchlist.map((w)=>w.symbol)].filter(Boolean).map((s, i)=>(
                  <option key={i} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <iframe
              title="TradingView Chart"
              className="h-[640px] w-full border-0"
              src={`https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(symbol)}&interval=15&theme=light&style=1&hideideas=1&withdateranges=1&saveimage=1`}
            />
          </section>

          <aside className="space-y-5">
            <div className="rounded-[2rem] border border-[#E5E7EB] bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                <h2 className="text-lg font-medium">ALMA Checklist</h2>
              </div>

              <div className="mt-4 space-y-3 text-sm">
                {[
                  "EMA 9/21 aligned",
                  "VWAP reclaim confirmed",
                  "Volume supports move",
                  "Liquidity zone identified",
                  "Stop and target defined"
                ].map((item)=>(
                  <div key={item} className="flex items-center gap-2 rounded-2xl bg-[#F7F7F8] p-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-[#E5E7EB] bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                <h2 className="text-lg font-medium">Journal Trade</h2>
              </div>

              <div className="mt-4 grid gap-3">
                <input value={direction} onChange={(e)=>setDirection(e.target.value)} placeholder="Calls / Puts" className="rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-3 text-sm outline-none" />
                <input value={setup} onChange={(e)=>setSetup(e.target.value)} placeholder="Setup type" className="rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-3 text-sm outline-none" />
                <input value={entry} onChange={(e)=>setEntry(e.target.value)} placeholder="Entry" className="rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-3 text-sm outline-none" />
                <input value={stop} onChange={(e)=>setStop(e.target.value)} placeholder="Stop" className="rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-3 text-sm outline-none" />
                <input value={target} onChange={(e)=>setTarget(e.target.value)} placeholder="Target" className="rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-3 text-sm outline-none" />
                <textarea value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="What did ALMA see? What is the lesson?" className="min-h-24 rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] p-4 text-sm outline-none" />
              </div>

              <button onClick={saveJournal} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-medium text-white">
                <Save className="h-4 w-4" />
                Save Journal
              </button>
            </div>

            <div className="rounded-[2rem] border border-[#E5E7EB] bg-white p-5 shadow-sm">
              <h2 className="text-lg font-medium">Watchlist</h2>

              <button onClick={()=>addWatchlist()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#F7F7F8] px-5 py-3 text-sm font-medium">
                <Plus className="h-4 w-4" />
                Add {symbol}
              </button>

              <div className="mt-4 flex flex-wrap gap-2">
                {watchlist.map((w)=>(
                  <button key={w.id} onClick={()=>setSymbol(w.symbol)} className="rounded-full bg-black px-4 py-2 text-sm text-white">
                    {w.symbol}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>

        <section className="mt-6 rounded-[2rem] border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-medium">Recent Journal</h2>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {journal.length === 0 ? (
              <div className="rounded-2xl bg-[#F7F7F8] p-4 text-sm text-[#6B7280]">
                No journal entries yet.
              </div>
            ) : (
              journal.map((j)=>(
                <div key={j.id} className="rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] p-4">
                  <div className="font-medium">{j.symbol} - {j.direction}</div>
                  <div className="mt-1 text-sm text-[#6B7280]">{j.setup}</div>
                  <div className="mt-3 text-sm">Entry: {j.entry || "-"} | Stop: {j.stop || "-"} | Target: {j.target || "-"}</div>
                  <p className="mt-3 text-sm text-[#6B7280]">{j.notes}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
