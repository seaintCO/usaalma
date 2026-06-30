export type ImageCategory = "photo" | "logo" | "product" | "social" | "architecture" | "general";

export function detectImageCategory(prompt:string):ImageCategory {
  const p = prompt.toLowerCase();

  if (/(logo|brand mark|icon|emblem|symbol)/.test(p)) return "logo";
  if (/(product|bottle|package|ecommerce|commercial|advertisement|ad shot)/.test(p)) return "product";
  if (/(instagram|post|story|thumbnail|banner|flyer|social)/.test(p)) return "social";
  if (/(house|building|interior|exterior|room|architecture|remodel)/.test(p)) return "architecture";
  if (/(photo|realistic|hyper realistic|photorealistic|sony|camera|portrait|cinematic)/.test(p)) return "photo";

  return "photo";
}

export function normalizeImageSize(size?:string) {
  if (size === "16:9") return "1536x864";
  if (size === "9:16") return "864x1536";
  if (size === "1:1") return "1024x1024";
  return "1024x1024";
}

export function buildImagePrompt(userPrompt:string, category?:ImageCategory) {
  const selected = category || detectImageCategory(userPrompt);

  if (selected === "logo") {
    return `Create a premium modern logo concept. Clean vector-style, luxury brand identity, minimal, memorable, professional, balanced composition, no photo background, no mockup, no fake text unless requested.

User request:
${userPrompt}`;
  }

  if (selected === "product") {
    return `Create a premium commercial product image. Ultra realistic studio lighting, luxury advertising quality, sharp details, physically accurate reflections, realistic shadows, high-end ecommerce photography, no AI artifacts.

User request:
${userPrompt}`;
  }

  if (selected === "social") {
    return `Create a premium social media creative. Modern layout, clean spacing, luxury editorial design, strong focal point, room for copy, high-end campaign look.

User request:
${userPrompt}`;
  }

  if (selected === "architecture") {
    return `Create a premium architectural visualization. Ultra realistic, natural light, clean luxury materials, realistic scale, editorial real estate photography, no AI distortion.

User request:
${userPrompt}`;
  }

  return `Create an ultra photorealistic image. Sony A7R V quality, cinematic lighting, natural depth of field, realistic textures, accurate shadows, detailed environment, premium editorial photography, natural imperfections, no AI look, no cartoon, no vector, no logo style.

User request:
${userPrompt}`;
}
