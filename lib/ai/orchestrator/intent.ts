export type AlmaIntent =
  | "chat"
  | "image_generate"
  | "image_edit"
  | "finance_analysis"
  | "video"
  | "code"
  | "document";

export function detectAlmaIntent(message:string):AlmaIntent {
  const p = message.toLowerCase().trim();

  // Translation / language requests should NOT trigger finance
  if (
    /^(en español|en espanol|in spanish|translate|traducir|traduce|ponlo en español|ponlo en espanol|hazlo en español|hazlo en espanol)/.test(p)
  ) {
    return "chat";
  }

  if (/(edit|change|remove|replace|make it|fix|enhance|upscale|background|editar|cambiar|remover|quita|arregla)/.test(p) && /(image|photo|picture|logo|design|imagen|foto)/.test(p)) {
    return "image_edit";
  }

  if (/(generate|create|make|draw|design|visualize|render|haz|crea|genera)/.test(p) && /(image|photo|picture|logo|poster|ad|thumbnail|lion|car|house|imagen|foto|anuncio)/.test(p)) {
    return "image_generate";
  }

  // Finance only when the user clearly asks for market/trading analysis
  if (
    /(analyze|analysis|analiza|análisis|analisis|trade|trading|calls|puts|chart|market|stock|options|opciones|vwap|ema|support|resistance|soporte|resistencia|liquidity|liquidez)/.test(p) &&
    /(spy|spx|qqq|nq|es|aapl|tsla|nvda|meta|msft|amzn|btc|crypto|stock|market|trading|calls|puts|chart|precio|acciones|opciones)/.test(p)
  ) {
    return "finance_analysis";
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
