import OpenAI from "openai";

export async function buildNocturaiPrompt(input:{
  useCase:string;
  platform:string;
  brand:string;
  audience:string;
  brief:string;
  hasProduct:boolean;
}) {
  const fallback = `Create a premium commercial image for ${input.platform}.
Brand: ${input.brand}
Audience: ${input.audience}
Goal: ${input.useCase}
Brief: ${input.brief}

Make it realistic, premium, clean, high-converting, with professional lighting, natural shadows, strong composition, and no AI artifacts. Preserve the product exactly if uploaded.`;

  if (!process.env.OPENAI_API_KEY) return fallback;

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await client.responses.create({
    model: process.env.ALMA_MODEL || "gpt-4o-mini",
    input: `You are ALMA Nocturai, an elite AI creative director.

Write one elite image-generation prompt.

Rules:
- Return only the final prompt.
- Optimize for business results.
- Include camera, lighting, composition, background, mood, product placement, platform format, and negative constraints.
- If product is uploaded, preserve exact product, label, logo, packaging, shape, and colors.
- Avoid warped text, fake labels, extra logos, distorted hands, distorted product, bad shadows, unrealistic reflections.

Use case: ${input.useCase}
Platform: ${input.platform}
Brand: ${input.brand}
Audience: ${input.audience}
Product uploaded: ${input.hasProduct ? "yes" : "no"}
Brief: ${input.brief}`
  });

  return response.output_text || fallback;
}
