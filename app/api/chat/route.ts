import { NextResponse } from "next/server";

import { askALMA } from "@/lib/ai/router";

import { getCurrentUser } from "@/lib/auth/user";

import { loadMemory } from "@/lib/memory/load";

export async function POST(req:Request){

const user=await getCurrentUser();

if(!user){

return NextResponse.json({

error:"Unauthorized"

},{status:401});

}

const body=await req.json();

const memory=await loadMemory(user.id);

const reply=await askALMA({

userId:user.id,

message:body.message,

memory

});

return NextResponse.json({

reply

});

}
