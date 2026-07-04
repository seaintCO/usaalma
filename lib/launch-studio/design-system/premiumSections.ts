export const PREMIUM_SECTIONS = [
  "hero_glass", "hero_split", "hero_dashboard", "hero_apple", "hero_luxury",
  "problem_grid", "solution_cards", "mock_dashboard", "analytics_table",
  "feature_bento", "feature_cards", "feature_timeline", "stats_grid",
  "social_proof", "testimonial_wall", "pricing_trio", "pricing_enterprise",
  "case_study", "portfolio_gallery", "process_steps", "comparison_table",
  "faq", "cta_glow", "cta_minimal", "team_grid", "roadmap", "investor_metrics",
  "market_size", "traction_chart", "acquisition_teaser", "services_grid",
  "before_after", "workflow_map", "risk_reduction", "security_section"
];

export function getPremiumLibrary() {
  return PREMIUM_SECTIONS.map((name, index)=>({
    id:name,
    name:name.replace(/_/g, " ").replace(/\b\w/g, c=>c.toUpperCase()),
    category:name.split("_")[0],
    quality:"premium",
    order:index
  }));
}
