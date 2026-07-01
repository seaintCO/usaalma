import { NextResponse } from "next/server";
import { requirePaidUser } from "@/lib/api/requirePaidUser";

export async function GET(req:Request) {
  const { error } = await requirePaidUser();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const symbols = searchParams.get("symbols") || "SPY,QQQ,AAPL,NVDA,TSLA,BTC-USD";

  const res = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}`, { cache:"no-store" });
  const data = await res.json();

  return NextResponse.json({ success:true, quotes:data?.quoteResponse?.result || [] });
}
