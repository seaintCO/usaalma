export const CREATIVE_TEMPLATES:any = {
  remove_background: {
    type:"edit",
    category:"remove_background",
    prompt:"Remove the background cleanly and keep the main subject sharp, realistic, and studio-quality."
  },
  replace_background: {
    type:"image",
    category:"replace_background",
    prompt:"Create a realistic product or subject image with a premium new background, natural lighting, realistic shadows, and commercial quality."
  },
  expand_image: {
    type:"edit",
    category:"expand_image",
    prompt:"Expand the image canvas naturally with matching environment, lighting, perspective, and realistic continuation."
  },
  object_removal: {
    type:"edit",
    category:"object_removal",
    prompt:"Remove unwanted objects cleanly while preserving the original scene, lighting, texture, and realism."
  },
  relighting: {
    type:"image",
    category:"relighting",
    prompt:"Create a relit cinematic version with premium lighting, realistic shadows, natural contrast, and commercial photography quality."
  },
  upscaling: {
    type:"edit",
    category:"upscaling",
    prompt:"Enhance sharpness, resolution, clarity, detail, and professional quality while keeping the image natural."
  },
  logo: {
    type:"image",
    category:"logos",
    prompt:"Create a premium modern logo concept, clean vector-style, luxury brand identity, minimal, memorable, professional."
  },
  instagram_post: {
    type:"image",
    category:"instagram_posts",
    prompt:"Create a premium Instagram post design, high-converting, modern layout, clean typography space, luxury social media creative."
  },
  instagram_story: {
    type:"image",
    category:"instagram_stories",
    prompt:"Create a vertical 9:16 Instagram story ad, premium design, modern layout, high contrast, strong visual hierarchy."
  },
  linkedin_banner: {
    type:"image",
    category:"linkedin_banners",
    prompt:"Create a professional LinkedIn banner, clean corporate design, premium tech aesthetic, modern business branding."
  },
  x_graphic: {
    type:"image",
    category:"x_graphics",
    prompt:"Create a clean X/Twitter post graphic, bold hook area, minimal modern design, premium social media aesthetic."
  },
  facebook_ad: {
    type:"image",
    category:"facebook_ads",
    prompt:"Create a high-converting Facebook ad creative, clear focal point, premium marketing design, realistic commercial quality."
  },
  white_background_product: {
    type:"image",
    category:"white_background_product",
    prompt:"Create a professional product photo on a clean white background, realistic shadows, ecommerce-ready, sharp detail."
  },
  lifestyle_product: {
    type:"image",
    category:"lifestyle_product",
    prompt:"Create a realistic lifestyle product photo in a premium environment, natural lighting, commercial photography quality."
  },
  apple_style_product: {
    type:"image",
    category:"apple_style_product",
    prompt:"Create an Apple-style product photo, minimal studio background, soft gradients, premium lighting, clean composition."
  },
  amazon_ready: {
    type:"image",
    category:"amazon_ready",
    prompt:"Create an Amazon-ready ecommerce product image, clean, sharp, professional, compliant white background style."
  },
  shopify_ready: {
    type:"image",
    category:"shopify_ready",
    prompt:"Create a Shopify-ready product image, premium ecommerce photography, clean layout, conversion-focused."
  }
};

export function buildCreativeTemplatePrompt(templateKey:string, userPrompt:string) {
  const template = CREATIVE_TEMPLATES[templateKey];

  if (!template) {
    return {
      type:"image",
      category:"general",
      prompt:userPrompt,
    };
  }

  return {
    type:template.type,
    category:template.category,
    prompt:`${template.prompt}

User request:
${userPrompt}`
  };
}
