import OpenAI from "openai";
import { OPENAI_MODELS } from "@/lib/ai/models";
export async function generateCampaignCopy(input:{brand?:string;concept?:string;audience?:string;language?:"en"|"es"}) {
  if (!process.env.OPENAI_API_KEY) return null;
  const language=input.language==="es"?"Spanish":"English";
  const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
  const response=await client.responses.create({model:OPENAI_MODELS.text,input:`Create concise educational marketing copy in ${language}. Brand: ${input.brand??""}. Concept: ${input.concept??""}. Audience: ${input.audience??""}. Return social captions, ad copy, and a product-photo prompt.`});
  return response.output_text?.trim()||null;
}
