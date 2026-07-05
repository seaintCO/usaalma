export type AlmaMode = "auto" | "fast" | "deep";

export function detectComplexity(message:string) {
  const text = (message || "").toLowerCase();

  const deepSignals = [
    "analyze", "audit", "contract", "pdf", "file", "code", "debug",
    "strategy", "launch", "trading", "market", "build", "fix",
    "business plan", "legal", "financial", "investor", "presentation",
    "explain deeply", "step by step", "sql", "powershell"
  ];

  const isDeep = deepSignals.some((word)=>text.includes(word)) || text.length > 600;

  return isDeep ? "deep" : "fast";
}

export function chooseAlmaModel(message:string, mode:AlmaMode = "auto") {
  const fastModel = process.env.ALMA_FAST_MODEL || "gpt-5.5-instant";
  const deepModel = process.env.ALMA_DEEP_MODEL || process.env.ALMA_REASONING_MODEL || "gpt-5.5";

  if (mode === "fast") return fastModel;
  if (mode === "deep") return deepModel;

  return detectComplexity(message) === "deep" ? deepModel : fastModel;
}
