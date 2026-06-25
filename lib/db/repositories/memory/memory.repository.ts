import { createClient } from "@/lib/supabase/server";

export class MemoryRepository {

  static async all(userId:string){

    const supabase=await createClient();

    const {data}=await supabase

    .from("memories")

    .select("*")

    .eq("user_id",userId)

    .order("importance",{

      ascending:false

    });

    return data??[];

  }

  static async save(

    userId:string,

    category:string,

    key:string,

    value:string,

    importance:number=5

  ){

    const supabase=await createClient();

    await supabase

    .from("memories")

    .upsert({

      user_id:userId,

      category,

      memory_key:key,

      memory_value:value,

      importance

    });

  }

}
