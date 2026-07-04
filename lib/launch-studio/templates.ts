import { LaunchDemo } from "./schema";

export const LAUNCH_TEMPLATES = [
  {
    id: "saas",
    name: "SaaS Demo",
    description: "Premium software mockup with dashboard, features, pricing, and CTA."
  },
  {
    id: "portfolio",
    name: "Business Portfolio",
    description: "Company profile, services, proof, case studies, and contact CTA."
  },
  {
    id: "investor",
    name: "Investor Pitch",
    description: "Problem, solution, market, traction, model, roadmap, and ask."
  },
  {
    id: "agency",
    name: "Agency Proposal",
    description: "Client-facing proposal shell with deliverables, pricing, process, and proof."
  },
  {
    id: "luxury",
    name: "Luxury Brand",
    description: "Dark premium brand page with cinematic sections and elegant CTA."
  }
];

export function getTemplateInstruction(template:string) {
  if (template === "portfolio") return "Make this a business portfolio with company overview, services, proof, case studies, and CTA.";
  if (template === "investor") return "Make this an investor pitch page with problem, solution, market, traction, business model, roadmap, and CTA.";
  if (template === "agency") return "Make this a client proposal with problem, solution, deliverables, process, pricing, and next steps.";
  if (template === "luxury") return "Make this a luxury premium brand demo with cinematic dark styling, high-end copy, and elite positioning.";
  return "Make this a SaaS/product demo with hero, mock dashboard, features, workflow, pricing, and CTA.";
}
