export function allowedModulesForPlan(plan:string) {
  if (plan === "business") {
    return [
      "planner",
      "tasks",
      "notes",
      "documents",
      "image_generator",
      "crm",
      "invoicing",
      "workflows",
      "workspaces",
      "ai_receptionist",
      "automations",
      "email_marketing",
      "sms",
      "website_builder",
      "image_generator",
    ];
  }

  if (plan === "personal") {
    return [
      "planner",
      "tasks",
      "notes",
      "documents",
      "image_generator",
      "workspaces",
    ];
  }

  return [];
}

export function moduleAllowed(plan:string, moduleKey:string) {
  return allowedModulesForPlan(plan).includes(moduleKey);
}

