export async function generateLaunchDemo(prompt:string) {
  return {
    title: "ALMA Launch Demo",
    prompt,
    theme: "futuristic-dark",
    sections: [
      {
        type: "hero",
        eyebrow: "AI GENERATED LIVE DEMO",
        headline: "Build the shell before the product exists.",
        subheadline: "Turn any business idea into a premium demo, portfolio, or pitch-ready experience in minutes.",
        primary: "Launch Demo",
        secondary: "View Mockup"
      },
      {
        type: "table",
        title: "Live Product Preview",
        rows: [
          ["ALMA OS", "AI Platform", "Active", "+42%"],
          ["Launch Studio", "Demo Builder", "Beta", "+88%"],
          ["CRM Memory", "Business Data", "Live", "+21%"],
          ["Vercel Export", "Static HTML", "Ready", "+100%"]
        ]
      },
      {
        type: "stats",
        title: "Built for speed, polish, and presentation.",
        stats: [
          ["Demo Time", "3 min"],
          ["Export", "index.html"],
          ["Design", "React + Tailwind"],
          ["Deploy", "Vercel Ready"]
        ]
      }
    ]
  };
}
