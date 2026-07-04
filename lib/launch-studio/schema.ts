export type LaunchSection = {
  type: "hero" | "mock_dashboard" | "features" | "stats" | "process" | "pricing" | "testimonials" | "cta";
  eyebrow?: string;
  headline?: string;
  subheadline?: string;
  title?: string;
  description?: string;
  bullets?: string[];
  cards?: { title:string; description:string; metric?:string }[];
  rows?: string[][];
  stats?: string[][];
  steps?: { title:string; description:string }[];
  plans?: { name:string; price:string; features:string[] }[];
};

export type LaunchDemo = {
  title: string;
  slug: string;
  theme: "midnight" | "luxury" | "apple" | "neon" | "enterprise";
  accent: "blue" | "cyan" | "purple" | "gold" | "emerald";
  nav: string[];
  sections: LaunchSection[];
};