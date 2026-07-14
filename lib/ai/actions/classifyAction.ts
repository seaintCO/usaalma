import OpenAI from "openai";

export type AlmaAction =
  | "save_memory"
  | "create_planner_task"
  | "create_invoice"
  | "log_food"
  | "save_fitness_goal"
  | "none";

export async function classifyAction(message:string):Promise<{
  action:AlmaAction;
  payload:any;
}> {
  if (!process.env.OPENAI_API_KEY) {
    return { action:"none", payload:{} };
  }

  const client = new OpenAI({ apiKey:process.env.OPENAI_API_KEY });

  const result:any = await client.responses.create({
    model:process.env.ALMA_ROUTER_MODEL || "gpt-5.6-luna",
    input:`
You are ALMA's autonomous action router.

Return ONLY valid JSON:
{
  "action": "save_memory | create_planner_task | create_invoice | log_food | save_fitness_goal | none",
  "payload": {}
}

Rules:
- If user says remember, save, note, my preference, my goal, return save_memory.
- If user asks to add something to planner/calendar/tasks, return create_planner_task.
- If user asks to create an invoice, return create_invoice.
- If user says they ate food or wants to log calories, return log_food.
- If user updates calorie/protein/fitness goals, return save_fitness_goal.
- If uncertain, return none.

User message:
${message}
`
  });

  try {
    return JSON.parse(String(result.output_text || "{}"));
  } catch {
    return { action:"none", payload:{} };
  }
}

