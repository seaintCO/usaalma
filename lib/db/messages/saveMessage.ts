import {createClient} from "@/lib/supabase/server";

export async function saveMessage(

conversationId:string,

userId:string,

role:string,

content:string

){

const supabase=await createClient();

await supabase

.from("messages")

.insert({

conversation_id:conversationId,

user_id:userId,

role,

content

});

}
