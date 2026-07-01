export type AlmaIntent = "chat" | "image_generate" | "image_edit" | "video" | "code" | "document";

export function detectAlmaIntent(message:string):AlmaIntent {
  const p = message.toLowerCase();

  if (/(edit|change|remove|replace|make it|fix|enhance|upscale|background|editar|cambiar|remover|quita|arregla)/.test(p) && /(image|photo|picture|logo|design|imagen|foto)/.test(p)) {
    return "image_edit";
  }

  if (/(generate|create|make|draw|design|visualize|render|haz|crea|genera)/.test(p) && /(image|photo|picture|logo|poster|ad|thumbnail|lion|car|house|imagen|foto|anuncio)/.test(p)) {
    return "image_generate";
  }

  if (/(video|reel|animation|animate|tiktok|youtube short)/.test(p)) {
    return "video";
  }

  if (/(code|build|component|api|sql|powershell|terminal|debug|fix error)/.test(p)) {
    return "code";
  }

  if (/(document|pdf|proposal|contract|invoice|report)/.test(p)) {
    return "document";
  }

  return "chat";
}
