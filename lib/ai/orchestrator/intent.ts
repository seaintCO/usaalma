export type AlmaIntent =
  | "chat"
  | "image_generate"
  | "image_edit"
  | "video"
  | "code"
  | "document";

export function detectAlmaIntent(message:string):AlmaIntent {
  const p = message.toLowerCase();

  if (/(edit|change|remove|replace|make it|fix|enhance|upscale|background)/.test(p) && /(image|photo|picture|logo|design)/.test(p)) {
    return "image_edit";
  }

  if (/(generate|create|make|draw|design|visualize|render)/.test(p) && /(image|photo|picture|logo|poster|ad|thumbnail|banner|flyer|mockup|product|lion|car|house)/.test(p)) {
    return "image_generate";
  }

  if (/(video|reel|animation|animate|cinematic clip|youtube short|tiktok)/.test(p)) {
    return "video";
  }

  if (/(code|build|component|api|sql|powershell|terminal|debug|fix this error)/.test(p)) {
    return "code";
  }

  if (/(document|pdf|proposal|contract|invoice|report|write me a file)/.test(p)) {
    return "document";
  }

  return "chat";
}
