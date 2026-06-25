import {createClient} from "@/lib/supabase/server";

export async function loadMessages(

conversationId:string

){

const supabase=await createClient();

const {data}=await supabase

.from("messages")

.select("*")

.eq("conversation_id",conversationId)

.order("created_at");

return data ?? [];

}
