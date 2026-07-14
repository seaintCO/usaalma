import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { TaskRepository } from "@/lib/db/repositories/tasks/task.repository";

async function userOrResponse(){ const user=await getCurrentUser(); return user ?? null; }
export async function PATCH(request:Request, ctx:{params:Promise<{taskId:string}>}) { const user=await userOrResponse(); if(!user)return NextResponse.json({error:"Unauthorized"},{status:401}); const {taskId}=await ctx.params; const body=await request.json(); try { const task=await TaskRepository.update(user.id,taskId,{title:body.title,description:body.description,priority:body.priority,dueAt:body.dueAt,status:body.status}); return NextResponse.json(task); } catch { return NextResponse.json({error:"Task not found or could not be updated"},{status:404}); } }
export async function DELETE(_request:Request, ctx:{params:Promise<{taskId:string}>}) { const user=await userOrResponse(); if(!user)return NextResponse.json({error:"Unauthorized"},{status:401}); const {taskId}=await ctx.params; try { await TaskRepository.delete(user.id,taskId); return NextResponse.json({success:true}); } catch { return NextResponse.json({error:"Task not found or could not be deleted"},{status:404}); } }
