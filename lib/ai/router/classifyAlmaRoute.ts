import OpenAI from "openai";

export type AlmaRoute =
  | "chat"
  | "image_generate"
  | "image_edit"
  | "finance_analysis"
  | "file_analysis"
  | "code"
  | "document"
  | "planner"
  | "fitness"
  | "invoice";

export async function classifyAlmaRoute(message:string):Promise<AlmaRoute> {
  if (!process.env.OPENAI_API_KEY) return "chat";

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const result:any = await client.responses.create({
    model: process.env.ALMA_ROUTER_MODEL || "gpt-5.5-mini",
    input: `
Classify the user's intent for ALMA.

Return ONLY one label:
chat
image_generate
image_edit
finance_analysis
file_analysis
code
document
planner
fitness
invoice

Rules:
- If the user asks to translate, rewrite, explain, continue, or respond normally, return chat.
- If user says "en español", "in Spanish", or "translate", return chat.
- Only return finance_analysis if they clearly ask about trading, markets, stocks, crypto, calls, puts, charts, SPY, SPX, AAPL, etc.
- Only return image_generate if they clearly ask to create/generate/draw/render an image.
- Only return image_edit if they ask to modify an uploaded image.
- When uncertain, return chat.

User message:
${message}
`
  });

  const label = String(result.output_text || "chat").trim();

  const allowed = [
    "chat",
    "image_generate",
    "image_edit",
    "finance_analysis",
    "file_analysis",
    "code",
    "document",
    "planner",
    "fitness",
    "invoice",
  ];

  return allowed.includes(label) ? label as AlmaRoute : "chat";
}
