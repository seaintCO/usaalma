export const LAUNCH_THEMES:any = {
  apple: {
    name:"Apple",
    bg:"#f8fafc",
    text:"#0f172a",
    muted:"#64748b",
    accent:"#111827",
    surface:"rgba(255,255,255,.75)",
    border:"rgba(15,23,42,.10)",
    vibe:"minimal, white, premium, Apple keynote, clean spacing"
  },
  luxury: {
    name:"Luxury",
    bg:"#050505",
    text:"#ffffff",
    muted:"rgba(255,255,255,.58)",
    accent:"#d4af37",
    surface:"rgba(255,255,255,.045)",
    border:"rgba(212,175,55,.25)",
    vibe:"black, gold, cinematic, private equity, premium luxury"
  },
  fintech: {
    name:"Fintech",
    bg:"#020617",
    text:"#ffffff",
    muted:"rgba(255,255,255,.60)",
    accent:"#22d3ee",
    surface:"rgba(8,47,73,.28)",
    border:"rgba(34,211,238,.25)",
    vibe:"finance, data-heavy, trust, charts, glass dashboard"
  },
  construction: {
    name:"Construction",
    bg:"#0c0a09",
    text:"#fff7ed",
    muted:"rgba(255,237,213,.62)",
    accent:"#f97316",
    surface:"rgba(154,52,18,.20)",
    border:"rgba(249,115,22,.25)",
    vibe:"strong, industrial, contractor, field operations, bold"
  },
  startup: {
    name:"Startup",
    bg:"#02040a",
    text:"#ffffff",
    muted:"rgba(255,255,255,.58)",
    accent:"#3b82f6",
    surface:"rgba(59,130,246,.10)",
    border:"rgba(59,130,246,.25)",
    vibe:"SaaS, futuristic, venture-backed, clean, high-conversion"
  },
  enterprise: {
    name:"Enterprise",
    bg:"#0f172a",
    text:"#ffffff",
    muted:"rgba(255,255,255,.60)",
    accent:"#8b5cf6",
    surface:"rgba(255,255,255,.055)",
    border:"rgba(139,92,246,.25)",
    vibe:"corporate, secure, scalable, executive, professional"
  }
};

export function getTheme(id:string) {
  return LAUNCH_THEMES[id] || LAUNCH_THEMES.startup;
}
