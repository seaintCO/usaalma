import {createClient} from "@/lib/supabase/server";

export async function getConversation(id:string){

const supabase=await createClient();

const {data}=await supabase

.from("conversations")

.select("*")

.eq("id",id)

.single();

return data;

}
