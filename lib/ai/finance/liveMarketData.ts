export async function getLiveMarketData(symbol:string) {
  const clean = symbol
    .replace("NASDAQ:", "")
    .replace("NYSE:", "")
    .replace("AMEX:", "")
    .trim()
    .toUpperCase();

  const res = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(clean)}`, {
    cache: "no-store",
  });

  const data = await res.json();
  return data?.quoteResponse?.result?.[0] || null;
}
