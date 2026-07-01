export type ImageCategory = "photo" | "logo" | "product" | "social" | "architecture" | "general";

export function detectImageCategory(prompt:string):ImageCategory {
  const p = prompt.toLowerCase();

  if (/(logo|brand|icon|emblem|mark)/.test(p)) return "logo";
  if (/(product|bottle|package|ecommerce|commercial|advertisement|ad shot)/.test(p)) return "product";
  if (/(instagram|post|story|thumbnail|banner|flyer|social)/.test(p)) return "social";
  if (/(house|building|interior|exterior|room|architecture|remodel)/.test(p)) return "architecture";

  return "photo";
}

export function normalizeImageSize(size?:string) {
  if (size === "16:9") return "1536x864";
  if (size === "9:16") return "864x1536";
  return "1024x1024";
}

export function buildImagePrompt(prompt:string, category?:ImageCategory) {
  const selected = category || detectImageCategory(prompt);

  const base = `
Ultra premium image generation.
No AI artifacts.
No distorted anatomy.
No extra fingers.
No fake text unless requested.
Natural texture.
Realistic lighting.
Professional composition.
High resolution.
`;

  if (selected === "logo") {
    return `${base}
Create a luxury modern logo.
Clean vector style.
Memorable brand mark.
Minimal.
Balanced.
Professional.
No mockup.
No photo background.

User request:
${prompt}`;
  }

  if (selected === "product") {
    return `${base}
Create a premium commercial product advertisement.
Studio lighting.
Sharp reflections.
Luxury campaign quality.
Realistic shadows.
High-end ecommerce/product photography.

User request:
${prompt}`;
  }

  if (selected === "architecture") {
    return `${base}
Create premium architectural visualization.
Realistic scale.
Natural light.
Luxury materials.
Editorial real estate photography.

User request:
${prompt}`;
  }

  return `${base}
Create an ultra photorealistic image.
Sony A7R V camera quality.
Cinematic lighting.
Natural depth of field.
Realistic textures.
Premium editorial photography.
No cartoon.
No vector.
No logo style.

User request:
${prompt}`;
}
