import { NextResponse } from "next/server";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { ImageRepository } from "@/lib/db/repositories/images/image.repository";
export async function DELETE(_request:Request,context:{params:Promise<{id:string}>}){const{user,error}=await requirePaidUser();if(error)return error;await ImageRepository.delete(user.id,(await context.params).id);return NextResponse.json({success:true});}
