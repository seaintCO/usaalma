import { getTheme } from "../design-system/themes";

export function planLaunchLayout(prompt:string, template:string, themeId:string) {
  const theme = getTheme(themeId);
  const lower = `${prompt} ${template}`.toLowerCase();

  let sections = ["hero_dashboard", "mock_dashboard", "feature_bento", "stats_grid", "process_steps", "pricing_trio", "cta_glow"];

  if (lower.includes("investor") || lower.includes("pitch") || lower.includes("raise")) {
    sections = ["hero_luxury", "problem_grid", "solution_cards", "market_size", "traction_chart", "business_model", "roadmap", "cta_glow"];
  }

  if (lower.includes("portfolio") || lower.includes("personal") || lower.includes("agency")) {
    sections = ["hero_split", "services_grid", "portfolio_gallery", "case_study", "testimonial_wall", "pricing_enterprise", "cta_minimal"];
  }

  if (lower.includes("construction") || lower.includes("roof") || lower.includes("contractor")) {
    sections = ["hero_dashboard", "services_grid", "before_after", "workflow_map", "stats_grid", "testimonial_wall", "cta_glow"];
  }

  return {
    theme,
    themeId,
    sections,
    instruction: `
Use this design direction:
Theme: ${theme.name}
Vibe: ${theme.vibe}
Sections: ${sections.join(", ")}
Rules:
- Premium spacing.
- Strong visual hierarchy.
- Short copy.
- Include numbers, proof, CTA.
- Make it feel like an elite SaaS/product demo, not a generic website.
`
  };
}
