import OpenAI from "openai";
import { ImageRepository, type ImageAspectRatio, type ImageQuality } from "@/lib/db/repositories/images/image.repository";
import { buildImagePrompt, normalizeImageSize } from "@/lib/ai/images/imagePromptRouter";

export type GenerateImageOptions = { aspectRatio?: ImageAspectRatio; quality?: ImageQuality; executionId?: string; idempotencyKey?: string; sourceImageId?: string; sourceImageBase64?: string; sourceMimeType?: string };
const ratioForSize = (size?: string): ImageAspectRatio => size === "16:9" || size === "1536x1024" ? "landscape" : size === "9:16" || size === "1024x1536" ? "portrait" : "square";
export async function generateImageTool(userId:string, prompt:string, size?:string, options:GenerateImageOptions = {}) {
  if (!process.env.OPENAI_API_KEY) return { success:false, message:"OPENAI_API_KEY is not configured." };
  const idempotencyKey=options.idempotencyKey ?? (options.executionId ? `image:${options.executionId}` : undefined);
  const existing=await ImageRepository.findByIdempotency(userId,idempotencyKey);
  if(existing?.status==="completed"&&existing.image_base64)return {success:true,message:"Image already generated.",image:{...existing,outputBase64:existing.image_base64}};
  if(existing?.status==="generating")return {success:false,message:"Image generation is already in progress.",image:existing};
  const aspectRatio=options.aspectRatio ?? ratioForSize(size); const quality=options.quality ?? "high";
  const record=existing ?? await ImageRepository.create(userId,{prompt,status:"generating",sourceImageId:options.sourceImageId,executionId:options.executionId,idempotencyKey,aspectRatio,quality});
  try { const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY}); let imageBase64:string|undefined;
    if(options.sourceImageBase64){const { editOpenAIImage }=await import("@/lib/creative/providers/openaiImageEdit.provider");imageBase64=await editOpenAIImage({imageBase64:options.sourceImageBase64,mimeType:options.sourceMimeType??"image/png",prompt:buildImagePrompt(prompt),size:normalizeImageSize(aspectRatio==="landscape"?"16:9":aspectRatio==="portrait"?"9:16":"1:1"),quality});}
    else {const result:any=await client.images.generate({model:(await import("@/lib/ai/models")).OPENAI_MODELS.image,prompt:buildImagePrompt(prompt),size:normalizeImageSize(aspectRatio==="landscape"?"16:9":aspectRatio==="portrait"?"9:16":"1:1"),quality});imageBase64=result.data?.[0]?.b64_json;}
    if(!imageBase64)throw new Error("Image provider returned no image."); const saved=await ImageRepository.complete(userId,record.id,imageBase64); return {success:true,message:"Image generated.",image:{...saved,outputBase64:imageBase64}};
  } catch { await ImageRepository.fail(userId,record.id); return {success:false,message:"Image generation failed."}; }
}
