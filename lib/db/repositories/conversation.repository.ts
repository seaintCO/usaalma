import { createClient } from "@/lib/supabase/server";

export class ConversationRepository {

  static async create(userId:string,title:string){

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

  static async list(userId:string){

    const supabase=await createClient();

    const {data}=await supabase

    .from("conversations")

    .select("*")

    .eq("user_id",userId)

    .order("updated_at",{

      ascending:false

    });

    return data??[];

  }

  static async rename(

    id:string,

    title:string

  ){

    const supabase=await createClient();

    await supabase

    .from("conversations")

    .update({

      title

    })

    .eq("id",id);

  }

  static async delete(id:string){

    const supabase=await createClient();

    await supabase

    .from("conversations")

    .delete()

    .eq("id",id);

  }

}
