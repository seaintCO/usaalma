"use client";

import { useEffect, useState } from "react";
import { Brain, CheckCircle2, ClipboardList, Plus, Save, TrendingUp, Upload } from "lucide-react";

const defaultSymbols = ["SPY", "QQQ", "NVDA", "TSLA", "AAPL", "META", "BTCUSD"];

export default function TraderPanel() {
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
      body:JSON.stringify({ symbol, direction, setup, entry, stop, target, notes, confidence:82 })
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
    <div className="h-full overflow-y-auto bg-[#F6F7F9] px-4 py-5 text-black md:px-8 md:py-8">
      <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-sm md:p-8">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-[#9CA3AF]">ALMA Trader OS</p>

        <div className="mt-4 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <h1 className="text-4xl font-normal tracking-tight md:text-7xl">Trade with memory.</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#6B7280] md:text-lg">
              Chart workspace, AI analyst, journal, watchlist, checklist, and your personal trading playbook.
            </p>
          </div>

          <a href="/finance" className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-medium text-white">
            <Upload className="h-4 w-4" />
            Analyze Screenshot
          </a>
        </div>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_420px]">
        <div className="overflow-hidden rounded-[2rem] border border-[#E5E7EB] bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-[#E5E7EB] p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-black text-white">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#9CA3AF]">Active chart</p>
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

        <aside className="space-y-5">
          <div className="rounded-[2rem] border border-[#E5E7EB] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              <h2 className="text-xl font-medium">ALMA Trade Checklist</h2>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              {[
                "Trend direction is clear",
                "VWAP / key level is respected",
                "Volume confirms the move",
                "Liquidity area is identified",
                "Entry, stop, and target are defined"
              ].map((item)=>(
                <div key={item} className="flex items-center gap-3 rounded-2xl bg-[#F7F7F8] p-4">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-[#E5E7EB] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              <h2 className="text-xl font-medium">Journal Trade</h2>
            </div>

            <div className="mt-4 grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <input value={direction} onChange={(e)=>setDirection(e.target.value)} placeholder="Calls / Puts" className="rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-3 text-sm outline-none" />
                <input value={setup} onChange={(e)=>setSetup(e.target.value)} placeholder="Setup" className="rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-3 text-sm outline-none" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <input value={entry} onChange={(e)=>setEntry(e.target.value)} placeholder="Entry" className="rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-3 text-sm outline-none" />
                <input value={stop} onChange={(e)=>setStop(e.target.value)} placeholder="Stop" className="rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-3 text-sm outline-none" />
                <input value={target} onChange={(e)=>setTarget(e.target.value)} placeholder="Target" className="rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-3 text-sm outline-none" />
              </div>

              <textarea value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="What did ALMA see? What was the lesson?" className="min-h-28 rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] p-4 text-sm outline-none" />
            </div>

            <button onClick={saveJournal} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-medium text-white">
              <Save className="h-4 w-4" />
              Save Journal
            </button>
          </div>

          <div className="rounded-[2rem] border border-[#E5E7EB] bg-white p-5 shadow-sm">
            <h2 className="text-xl font-medium">Watchlist</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {[...defaultSymbols, ...watchlist.map((w)=>w.symbol)].filter(Boolean).map((s, i)=>(
                <button key={i} onClick={()=>setSymbol(s)} className={`rounded-full px-4 py-2 text-sm ${symbol === s ? "bg-black text-white" : "bg-[#F7F7F8] text-[#6B7280]"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <section className="mt-5 rounded-[2rem] border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <h2 className="text-xl font-medium">Recent Journal</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {journal.length === 0 ? (
            <div className="rounded-2xl bg-[#F7F7F8] p-4 text-sm text-[#6B7280]">No journal entries yet.</div>
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
  );
}
