"use client";

import { useEffect, useState } from "react";
import { Search, TrendingUp } from "lucide-react";

export default function FinancePage() {
  const [symbols, setSymbols] = useState("SPY,QQQ,AAPL,NVDA,TSLA,BTC-USD");
  const [quotes, setQuotes] = useState<any[]>([]);

  async function loadQuotes() {
    const res = await fetch(`/api/finance/quote?symbols=${encodeURIComponent(symbols)}`);
    const data = await res.json();
    setQuotes(data.quotes || []);
  }

  useEffect(() => { loadQuotes(); }, []);

  return (
    <main className="min-h-screen bg-[#F7F7F8] px-4 py-8 text-[#111111] md:px-8">
      <div className="mx-auto max-w-6xl">
        <a href="/dashboard" className="text-sm text-[#6B7280] hover:text-black">← Back to ALMA</a>
        <div className="mt-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-white"><TrendingUp className="h-5 w-5" /></div>
          <div><h1 className="text-4xl font-medium tracking-tight">Finance</h1><p className="text-[#6B7280]">Stocks, ETFs, crypto, and watchlists.</p></div>
        </div>

        <div className="mt-8 flex gap-3 rounded-3xl border border-[#E5E7EB] bg-white p-3 shadow-sm">
          <input value={symbols} onChange={(e) => setSymbols(e.target.value)} className="flex-1 rounded-2xl bg-[#F7F7F8] px-4 py-3 outline-none" />
          <button onClick={loadQuotes} className="rounded-2xl bg-black px-5 text-white"><Search className="h-5 w-5" /></button>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {quotes.map((q) => {
            const change = Number(q.regularMarketChangePercent || 0);
            return (
              <div key={q.symbol} className="rounded-[1.5rem] border border-[#E5E7EB] bg-white p-5 shadow-sm">
                <div className="flex justify-between">
                  <div><div className="text-xl font-semibold">{q.symbol}</div><div className="line-clamp-1 text-sm text-[#6B7280]">{q.shortName || q.longName}</div></div>
                  <div className={change >= 0 ? "text-green-600" : "text-red-600"}>{change.toFixed(2)}%</div>
                </div>
                <div className="mt-6 text-3xl font-medium">{q.regularMarketPrice ? `$${Number(q.regularMarketPrice).toLocaleString()}` : "N/A"}</div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
