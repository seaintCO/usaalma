export function allowedModulesForPlan(plan:string) {
  if (plan === "business") {
    return [
      "planner",
      "tasks",
      "notes",
      "documents",
      "crm",
      "invoicing",
      "workflows",
      "workspaces",
      "ai_receptionist",
      "automations",
      "email_marketing",
      "sms",
      "website_builder",
    ];
  }

  if (plan === "personal") {
    return [
      "planner",
      "tasks",
      "notes",
      "documents",
      "workspaces",
    ];
  }

  return [];
}

export function moduleAllowed(plan:string, moduleKey:string) {
  return allowedModulesForPlan(plan).includes(moduleKey);
}
