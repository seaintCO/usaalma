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

export type AlmaPlan = {
  intent: AlmaIntent;
  tool: string;
  action: string;
  confidence: number;
  status: string;
  needsFollowup?: boolean;
  reason?: string;
};

export function detectImageSize(message:string) {
  if (/9:16|vertical|portrait/i.test(message)) return "1024x1536";
  if (/16:9|horizontal|landscape/i.test(message)) return "1536x1024";
  if (/1:1|square/i.test(message)) return "1024x1024";
  return "1024x1024";
}

export function buildImageFollowupPrompt(message:string, context:any) {
  const base = context?.last_image_prompt || message;
  return `${base}. Apply this change while preserving the same subject, style, lighting, realism, and quality: ${message}`;
}

export function planAlmaAction(message:string, context?:any): AlmaPlan {
  const m = message.toLowerCase();

  if (
    context?.last_image_prompt &&
    /\b(16:9|9:16|1:1|vertical|horizontal|portrait|landscape|iphone|realistic|más realista|background|fondo|edit|change|make it|hazlo|remix|same|again)\b/i.test(message)
  ) {
    return {
      intent:"image_followup",
      tool:"creative",
      action:"regenerate_image_with_context",
      confidence:0.95,
      status:"🖼️ Updating previous image...",
      reason:"User is modifying the previous image."
    };
  }

  if (/\b(generate|create|make|draw|render|photo|image|picture|logo|visual|ad|photoshoot)\b/i.test(message)) {
    return {
      intent:"image_generation",
      tool:"creative",
      action:"generate_image",
      confidence:0.95,
      status:"🎨 Generating image...",
      reason:"User requested visual creation."
    };
  }

  if (/\b(client|lead|customer|crm|prospect)\b/i.test(m)) {
    return { intent:"crm", tool:"crm", action:"crm_action", confidence:0.8, status:"👥 Working in CRM..." };
  }

  if (/\b(task|todo|remind|pendiente)\b/i.test(m)) {
    return { intent:"task", tool:"planner", action:"task_action", confidence:0.8, status:"✅ Planning task..." };
  }

  if (/\b(document|doc|file|pdf|proposal|contract)\b/i.test(m)) {
    return { intent:"document", tool:"documents", action:"document_action", confidence:0.8, status:"📄 Working with documents..." };
  }

  if (/\b(email|gmail|outlook|inbox|send|draft|reply)\b/i.test(m)) {
    return { intent:"email", tool:"email", action:"email_action", confidence:0.8, status:"📧 Working with email..." };
  }

  if (/\b(calendar|meeting|schedule|appointment)\b/i.test(m)) {
    return { intent:"calendar", tool:"calendar", action:"calendar_action", confidence:0.8, status:"📅 Checking calendar..." };
  }

  if (/\b(spx|spy|trading|calls|puts|market|chart|nasdaq|qqq)\b/i.test(m)) {
    return { intent:"trading", tool:"trading", action:"trading_action", confidence:0.8, status:"📈 Analyzing market..." };
  }

  if (/\b(call|phone|receptionist|twilio|voice)\b/i.test(m)) {
    return { intent:"receptionist", tool:"receptionist", action:"voice_action", confidence:0.8, status:"☎️ Preparing receptionist..." };
  }

  return {
    intent:"general",
    tool:"chat",
    action:"answer",
    confidence:0.6,
    status:"✨ Thinking..."
  };
}

export const getLiveStatus = (intent:string) => {
  if (intent === "image_generation") return "🎨 Generating image...";
  if (intent === "image_followup") return "🖼️ Updating previous image...";
  return "✨ Thinking...";
};

export function detectIntent(message:string, context?:any): AlmaIntent {
  return planAlmaAction(message, context).intent;
}

