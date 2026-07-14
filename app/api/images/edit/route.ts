import { NextResponse } from "next/server";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { ImageRepository } from "@/lib/db/repositories/images/image.repository";
import { generateImageTool } from "@/lib/tools/images/generateImageTool";

export async function POST(request: Request) { const {user,error}=await requirePaidUser(); if(error)return error; const body=await request.json(); if(!body.sourceImageId||!String(body.prompt??"").trim())return NextResponse.json({error:"Source image and edit prompt are required."},{status:400}); const source=await ImageRepository.get(user.id,String(body.sourceImageId)); if(!source?.image_base64)return NextResponse.json({error:"Source image not found."},{status:404}); const result=await generateImageTool(user.id,String(body.prompt),undefined,{sourceImageId:source.id,sourceImageBase64:source.image_base64,sourceMimeType:source.mime_type,aspectRatio:body.aspectRatio,quality:body.quality,idempotencyKey:typeof body.idempotencyKey==="string"?body.idempotencyKey:undefined}); return NextResponse.json(result,{status:result.success?200:400}); }
