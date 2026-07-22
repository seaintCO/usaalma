import { askOpenAI } from "@/lib/ai/openai";

export async function generatePresentationDeck(userId: string, prompt: string) {
  const system = `
You are ALMA Presentation Builder.
Create a futuristic investor-grade presentation.

Return ONLY valid JSON:
{
  "title": "string",
  "slides": [
    {
      "type": "cover|problem|solution|market|traction|business_model|team|cta",
      "headline": "string",
      "subheadline": "string",
      "bullets": ["string"],
      "visual": "string",
      "accent": "cyan|purple|gold|emerald|rose"
    }
  ]
}

Rules:
- 8 to 10 slides.
- Premium, Apple-level, futuristic.
- Short text, powerful story.
- For business portfolios, make it sales-focused.
- For investor decks, make it capital-focused.
`;

  const raw = await askOpenAI(userId, `${system}\n\nUser request:\n${prompt}`);

  try {
    return JSON.parse(raw);
  } catch {
    return {
      title: "ALMA Presentation",
      slides: [
        {
          type: "cover",
          headline: "ALMA Presentation",
          subheadline: prompt,
          bullets: ["AI-generated presentation draft"],
          visual: "premium abstract business visual",
          accent: "cyan",
        },
      ],
    };
  }
}
