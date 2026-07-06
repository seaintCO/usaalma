export type AlmaAppKey =
  | "planner"
  | "fitness"
  | "crm"
  | "invoices"
  | "trade"
  | "construct"
  | "studio"
  | "alma_ai"
  | "voice"
  | "automation";

export const ALMA_APPS = [
  { key: "planner", name: "Planner", href: "/planner", price: "Free", free: true },
  { key: "fitness", name: "Fitness", href: "/fitness", price: "Free", free: true },
  { key: "crm", name: "CRM", href: "/crm", price: "Free", free: true },
  { key: "invoices", name: "Invoices", href: "/invoicing", price: "Free", free: true },

  { key: "trade", name: "Trade", href: "/trader", price: "$39/mo", free: false },
  { key: "construct", name: "Construct", href: "/crm", price: "$79/mo", free: false },
  { key: "studio", name: "Studio", href: "/creative", price: "$29/mo", free: false },
  { key: "alma_ai", name: "ALMA AI", href: "/dashboard", price: "$39/mo", free: false },
  { key: "voice", name: "Voice", href: "/receptionist", price: "Usage", free: false },
  { key: "automation", name: "Automation", href: "/workflows", price: "Premium", free: false },
] as const;
