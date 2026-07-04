import { LaunchDemo } from "./schema";
import { planLaunchLayout } from "./planner/layoutPlanner";

function slugify(input:string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "alma-demo";
}

function fallback(prompt:string):LaunchDemo {
  return {
    title: "ALMA Launch Demo",
    slug: slugify(prompt),
    theme: "startup" as any,
    accent: "blue",
    nav: ["Overview", "Demo", "Features", "Pricing"],
    sections: [
      {
        type: "hero",
        eyebrow: "AI GENERATED LIVE DEMO",
        headline: "Turn any idea into a premium live demo.",
        subheadline: "ALMA Launch Studio creates futuristic SaaS mockups, business portfolios, pitch shells, and client presentations from one prompt.",
        bullets: ["Prompt to demo", "Export Next.js", "Deploy on Vercel"]
      },
      {
        type: "mock_dashboard",
        title: "Live Product Preview",
        rows: [
          ["ALMA OS", "AI Platform", "Active", "+42%"],
          ["Launch Studio", "Demo Builder", "Beta", "+88%"],
          ["CRM Memory", "Business Data", "Live", "+21%"],
          ["Vercel Export", "Next.js ZIP", "Ready", "+100%"]
        ]
      },
      {
        type: "features",
        title: "Built for founders who need to present fast.",
        cards: [
          { title: "Demo Shells", description: "Create a premium product illusion before the full product exists." },
          { title: "Business Portfolios", description: "Generate polished company profiles for clients and investors." },
          { title: "Investor Pages", description: "Turn ideas into pitch-ready narratives with strong visuals." }
        ]
      },
      {
        type: "stats",
        title: "Speed that feels unfair.",
        stats: [
          ["Build Time", "3 min"],
          ["Export", "Next.js ZIP"],
          ["Design", "React + Tailwind"],
          ["Deploy", "Vercel Ready"]
        ]
      },
      {
        type: "cta",
        headline: "Ready to launch the demo?",
        subheadline: "Export this experience and deploy it live."
      }
    ]
  };
}

export async function generateLaunchDemo(prompt:string, template:string = "saas", themeId:string = "startup"):Promise<LaunchDemo> {
  const plan = planLaunchLayout(prompt, template, themeId);

  if (!process.env.OPENAI_API_KEY) {
    return { ...fallback(prompt), theme:themeId as any };
  }

  const system = `
You are ALMA Launch Studio, an elite AI product demo designer.

Create an Aura-level futuristic live demo page, not a PowerPoint.
The output will become a deployable Next.js/Tailwind project.

Design Plan:
${plan.instruction}

Return ONLY valid JSON with this shape:
{
  "title": "string",
  "slug": "string",
  "theme": "apple|luxury|fintech|construction|startup|enterprise",
  "accent": "blue|cyan|purple|gold|emerald",
  "nav": ["string"],
  "sections": [
    {
      "type": "hero|mock_dashboard|features|stats|process|pricing|testimonials|cta",
      "eyebrow": "string",
      "headline": "string",
      "subheadline": "string",
      "title": "string",
      "description": "string",
      "bullets": ["string"],
      "cards": [{"title":"string","description":"string","metric":"string"}],
      "rows": [["string","string","string","string"]],
      "stats": [["string","string"]],
      "steps": [{"title":"string","description":"string"}],
      "plans": [{"name":"string","price":"string","features":["string"]}]
    }
  ]
}

Rules:
- Make it look like a premium SaaS/product demo.
- Use short powerful copy.
- Include hero, mock_dashboard, features, stats, process or pricing, and cta.
- Make it specific to the user's prompt.
- No markdown. No comments. JSON only.
`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.8,
        messages: [
          { role: "system", content: system },
          { role: "user", content: `${plan.instruction}

User prompt:
${prompt}` }
        ]
      })
    });

    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content || "";
    const json = raw.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(json);

    return {
      ...fallback(prompt),
      ...parsed,
      theme: themeId as any,
      slug: parsed.slug || slugify(parsed.title || prompt)
    };
  } catch {
    return { ...fallback(prompt), theme:themeId as any };
  }
}
