import { askOpenAI } from "./openai";
import { buildSystemPrompt } from "./prompts";

export async function askALMA(data:any){

const system=buildSystemPrompt(data.memory);

const reply=await askOpenAI(system + "\n\nUser:\n" + data.message);

return reply;

}
