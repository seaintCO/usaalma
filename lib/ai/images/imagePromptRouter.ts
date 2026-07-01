export function normalizeImageSize(size?:string) {
  if (size === "16:9") return "1536x864";
  if (size === "9:16") return "864x1536";
  return "1024x1024";
}

export function buildImagePrompt(prompt:string) {
  const p = prompt.toLowerCase();

  if (/(logo|brand|icon|emblem)/.test(p)) {
    return `Create a premium modern logo. Clean vector style, luxury brand identity, minimal, memorable, no photo background. User request: ${prompt}`;
  }

  return `Create an ultra photorealistic image. Sony A7R V quality, cinematic lighting, natural depth of field, realistic textures, accurate shadows, premium editorial photography, no AI look, no cartoon, no vector. User request: ${prompt}`;
}
