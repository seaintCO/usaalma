import OpenAI from "openai";

export async function buildNocturaiPrompt(input:{
  useCase:string;
  platform:string;
  brand:string;
  audience:string;
  brief:string;
  hasProduct:boolean;
}) {
  const fallback = `
Create a premium commercial image.

Use case: ${input.useCase}
Platform: ${input.platform}
Brand: ${input.brand}
Audience: ${input.audience}
Brief: ${input.brief}

Make it high-end, realistic, non-AI looking, clean composition, premium lighting, professional product photography, natural shadows, no distorted text, no warped logo, no fake unreadable labels.
`;

  if (!process.env.OPENAI_API_KEY) return fallback;

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await client.responses.create({
    model: process.env.ALMA_MODEL || "gpt-5.5",
    input: `
You are ALMA Nocturai, an elite AI creative director.

The user wants a commercial image. Write the best possible image-generation prompt.

Rules:
- Return only the final prompt.
- Be specific with camera, lighting, composition, background, product placement, texture, mood, ad style, platform format, and negative constraints.
- If product is uploaded, preserve the exact product, label, logo, packaging, shape, and colors.
- Make it look premium and realistic, not AI-generated.
- Avoid warped text, fake labels, extra logos, distorted hands, distorted product, bad shadows, and unrealistic reflections.
- Optimize for business outcome, not just aesthetics.

Use case: ${input.useCase}
Platform: ${input.platform}
Brand: ${input.brand}
Audience: ${input.audience}
Product uploaded: ${input.hasProduct ? "yes" : "no"}
User brief: ${input.brief}
`
  });

  return response.output_text || fallback;
}
