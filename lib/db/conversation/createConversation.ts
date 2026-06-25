import {createClient} from "@/lib/supabase/server";

export async function createConversation(

userId:string,

title:string

){

const supabase=await createClient();

const {data,error}=await supabase

.from("conversations")

.insert({

user_id:userId,

title

})

.select()

.single();

if(error) throw error;

return data;

}
