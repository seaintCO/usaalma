export const DASHBOARD_ROUTE = "/dashboard";

export const WORKSPACE_ROUTES = {
  tasks: "/tasks",
  notes: "/notes",
  planner: "/planner",
  documents: "/documents",
  fitness: "/fitness",
  crm: "/crm",
  construction: "/construction",
  invoicing: "/invoicing",
  images: "/images",
  creative: "/creative",
  launch: "/launch-studio",
  trader: "/trader",
  agents: "/agents",
  marketplace: "/marketplace",
  billing: "/billing",
  settings: "/settings",
} as const;

export type RoutedWorkspace = keyof typeof WORKSPACE_ROUTES;
