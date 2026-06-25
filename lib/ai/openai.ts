import OpenAI from "openai";
import { AI_CONFIG } from "../config/ai";

export async function askOpenAI(prompt:string){

const client=new OpenAI({
apiKey:process.env.OPENAI_API_KEY!
});

const response=await client.responses.create({

model:AI_CONFIG.model,

input:prompt

});

return response.output_text;

}
