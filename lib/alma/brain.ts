export type AlmaIntent =
  | "image_generation"
  | "image_followup"
  | "crm"
  | "task"
  | "document"
  | "email"
  | "calendar"
  | "fitness"
  | "trading"
  | "receptionist"
  | "general";

export function detectIntent(message:string, context?:any): AlmaIntent {
  const m = message.toLowerCase();

  if (
    context?.last_image_prompt &&
    /\b(16:9|9:16|1:1|vertical|horizontal|portrait|landscape|iphone|realistic|más realista|background|fondo|edit|change|make it|hazlo|remix)\b/i.test(message)
  ) return "image_followup";

  if (/\b(generate|create|make|draw|render|photo|image|picture|logo|visual|ad|photoshoot)\b/i.test(message)) return "image_generation";
  if (/\b(client|lead|customer|crm|prospect)\b/i.test(m)) return "crm";
  if (/\b(task|todo|remind|pendiente)\b/i.test(m)) return "task";
  if (/\b(document|doc|file|pdf|proposal)\b/i.test(m)) return "document";
  if (/\b(email|gmail|outlook|inbox|send|draft)\b/i.test(m)) return "email";
  if (/\b(calendar|meeting|schedule|appointment)\b/i.test(m)) return "calendar";
  if (/\b(food|calorie|workout|fitness|gym|meal)\b/i.test(m)) return "fitness";
  if (/\b(spx|spy|trading|calls|puts|market|chart)\b/i.test(m)) return "trading";
  if (/\b(call|phone|receptionist|twilio|voice)\b/i.test(m)) return "receptionist";

  return "general";
}

export function detectImageSize(message:string) {
  if (/9:16|vertical|portrait/i.test(message)) return "1024x1536";
  if (/16:9|horizontal|landscape/i.test(message)) return "1536x1024";
  if (/1:1|square/i.test(message)) return "1024x1024";
  return "1024x1024";
}

export function buildImageFollowupPrompt(message:string, context:any) {
  const base = context?.last_image_prompt || message;
  return `${base}. Apply this change while preserving the same subject, style, lighting and quality: ${message}`;
}

export function getLiveStatus(intent:string) {
  if (intent === "image_generation") return "🎨 Generating image...";
  if (intent === "image_followup") return "🖼️ Updating previous image...";
  if (intent === "email") return "📧 Working with email...";
  if (intent === "crm") return "👥 Checking CRM...";
  if (intent === "calendar") return "📅 Checking calendar...";
  if (intent === "document") return "📄 Working with documents...";
  if (intent === "trading") return "📈 Analyzing market...";
  if (intent === "receptionist") return "☎️ Preparing receptionist...";
  return "✨ Thinking...";
}
