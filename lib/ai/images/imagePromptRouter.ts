export function detectImageCategory(prompt:string) {
  const p = prompt.toLowerCase();

  if (p.includes("logo") || p.includes("brand") || p.includes("icon")) return "logo";
  if (p.includes("product") || p.includes("ad") || p.includes("commercial")) return "product";
  if (p.includes("realistic") || p.includes("photo") || p.includes("hyper")) return "photo";
  if (p.includes("instagram") || p.includes("post") || p.includes("story")) return "social";

  return "photo";
}

export function buildImagePrompt(userPrompt:string) {
  const category = detectImageCategory(userPrompt);

  if (category === "logo") {
    return `
Create a premium modern logo concept.
Clean vector-style, minimal, luxury brand identity, sharp edges, memorable, professional.
No mockup. No photo background. No extra text unless requested.

User request:
${userPrompt}
`;
  }

  if (category === "product") {
    return `
Create a premium commercial product image.
Ultra realistic, studio lighting, realistic shadows, sharp texture, luxury ad quality, high-end ecommerce photography.

User request:
${userPrompt}
`;
  }

  if (category === "social") {
    return `
Create a premium social media creative.
Modern layout, high-end design, clean typography space, strong focal point, luxury visual identity.

User request:
${userPrompt}
`;
  }

  return `
Create an ultra photorealistic image.
Sony A7R V camera quality, cinematic lighting, natural depth of field, realistic texture, accurate shadows, detailed environment, premium editorial photography, no AI look, no cartoon, no vector, no logo style.

User request:
${userPrompt}
`;
}
