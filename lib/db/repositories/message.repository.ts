import { createClient } from "@/lib/supabase/server";

export class MessageRepository {

static async create(

conversationId:string,

userId:string,

role:string,

content:string

){

const supabase=await createClient();

const { data, error } = await supabase

.from("messages")

.insert({

conversation_id:conversationId,

user_id:userId,

role,

content

})

.select()

.single();

if (error) throw error;

return data;

}

static async list(

conversationId:string

){

const supabase=await createClient();

const {data}=await supabase

.from("messages")

.select("*")

.eq("conversation_id",conversationId)

.order("created_at");

return data??[];

}

}
