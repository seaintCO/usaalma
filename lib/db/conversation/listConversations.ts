import {createClient} from "@/lib/supabase/server";

export async function listConversations(

userId:string

){

const supabase=await createClient();

const {data}=await supabase

.from("conversations")

.select("*")

.eq("user_id",userId)

.order("created_at",{

ascending:false

});

return data ?? [];

}
