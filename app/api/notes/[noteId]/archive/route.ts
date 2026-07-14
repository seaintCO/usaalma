import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { NoteRepository } from "@/lib/db/repositories/notes/note.repository";
export async function POST(request:Request,ctx:{params:Promise<{noteId:string}>}){const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});const {noteId}=await ctx.params;const {archived=true}=await request.json();try{return NextResponse.json(await NoteRepository.archive(user.id,noteId,Boolean(archived)));}catch{return NextResponse.json({error:"Note not found"},{status:404});}}
