import {createClient} from "@/lib/supabase/server";

export async function deleteConversation(

id:string

){

const supabase=await createClient();

await supabase

.from("conversations")

.delete()

.eq("id",id);

}
