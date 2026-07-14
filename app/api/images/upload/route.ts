import { NextResponse } from "next/server";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { ImageRepository } from "@/lib/db/repositories/images/image.repository";

export async function POST(request: Request) { const { user,error }=await requirePaidUser(); if(error)return error; const body=await request.json(); const imageBase64=typeof body.imageBase64==="string"?body.imageBase64.replace(/^data:[^;]+;base64,/,''):""; if(!imageBase64||imageBase64.length>14_000_000)return NextResponse.json({error:"A valid image under 10 MB is required."},{status:400}); const image=await ImageRepository.create(user.id,{prompt:String(body.name??"Uploaded source image"),imageBase64,status:"source",mimeType:typeof body.mimeType==="string"?body.mimeType:"image/png",aspectRatio:"square",quality:"medium"}); return NextResponse.json({success:true,image},{status:201}); }
