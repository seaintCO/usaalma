export function detectAlmaIntent(message:string) {
  const p = message.toLowerCase();

  if (/(generate|create|make|draw|design|visualize|render|haz|crea|genera)/.test(p) && /(image|photo|picture|logo|poster|ad|thumbnail|lion|car|house|imagen|foto|anuncio)/.test(p)) {
    return "image_generate";
  }

  return "chat";
}
