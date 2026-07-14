import { createClient } from "@/lib/supabase/server";

export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "open" | "in_progress" | "completed" | "cancelled";
export type TaskSource = "manual" | "alma_chat" | "planner" | "import";
export type TaskInput = { title: string; description?: string | null; priority?: TaskPriority; dueAt?: string | null; status?: TaskStatus; source?: TaskSource; sourceExecutionId?: string | null };
export type TaskFilters = { status?: "all" | "open" | "completed" | "overdue" | "today"; priority?: TaskPriority; query?: string };

export class TaskRepository {
  static async list(userId: string, filters: TaskFilters = {}) {
    const supabase = await createClient(); let query = supabase.from("tasks").select("*").eq("user_id", userId).order("due_at", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false });
    if (filters.status === "open") query = query.in("status", ["open", "in_progress"]);
    if (filters.status === "completed") query = query.eq("status", "completed");
    if (filters.status === "overdue") query = query.in("status", ["open", "in_progress"]).lt("due_at", new Date().toISOString());
    if (filters.status === "today") { const start = new Date(); start.setHours(0,0,0,0); const end = new Date(start); end.setDate(end.getDate()+1); query = query.gte("due_at", start.toISOString()).lt("due_at", end.toISOString()); }
    if (filters.priority) query = query.eq("priority", filters.priority);
    if (filters.query?.trim()) query = query.or(`title.ilike.%${filters.query.trim()}%,description.ilike.%${filters.query.trim()}%`);
    const { data, error } = await query; if (error) throw error; return data ?? [];
  }
  static async findExactTitle(userId:string, title:string) { const matches=await this.list(userId,{query:title,status:"all"}); return matches.filter((task:any)=>String(task.title).trim().toLowerCase()===title.trim().toLowerCase()); }
  static async get(userId: string, id: string) { const supabase = await createClient(); const { data, error } = await supabase.from("tasks").select("*").eq("id", id).eq("user_id", userId).maybeSingle(); if (error) throw error; return data; }
  static async create(userId: string, input: TaskInput | string) { const value = typeof input === "string" ? { title: input } : input; const supabase = await createClient(); const { data, error } = await supabase.from("tasks").insert({ user_id:userId, title:value.title, description:value.description ?? null, priority:value.priority ?? "medium", due_at:value.dueAt ?? null, status:value.status ?? "open", source:value.source ?? "manual", source_execution_id:value.sourceExecutionId ?? null, completed:false }).select().single(); if (error) throw error; return data; }
  static async createForChat(userId: string, input: TaskInput) { if (!input.sourceExecutionId) return this.create(userId, { ...input, source:"alma_chat" }); const existing = await this.listBySourceExecution(userId, input.sourceExecutionId); return existing ?? this.create(userId, { ...input, source:"alma_chat" }); }
  static async listBySourceExecution(userId:string, sourceExecutionId:string) { const supabase=await createClient(); const {data,error}=await supabase.from("tasks").select("*").eq("user_id",userId).eq("source_execution_id",sourceExecutionId).eq("source","alma_chat").maybeSingle(); if(error) throw error; return data; }
  static async update(userId:string,id:string,input:Partial<TaskInput>) { const supabase=await createClient(); const patch:any={}; if(input.title!==undefined)patch.title=input.title; if(input.description!==undefined)patch.description=input.description; if(input.priority!==undefined)patch.priority=input.priority; if(input.dueAt!==undefined)patch.due_at=input.dueAt; if(input.status!==undefined){patch.status=input.status;patch.completed=input.status==="completed";patch.completed_at=input.status==="completed"?new Date().toISOString():null;} const {data,error}=await supabase.from("tasks").update(patch).eq("id",id).eq("user_id",userId).select().single(); if(error)throw error; return data; }
  static complete(userId:string,id:string){return this.update(userId,id,{status:"completed"});} static reopen(userId:string,id:string){return this.update(userId,id,{status:"open"});} static cancel(userId:string,id:string){return this.update(userId,id,{status:"cancelled"});}
  static async delete(userId:string,id:string){const supabase=await createClient();const {error}=await supabase.from("tasks").delete().eq("id",id).eq("user_id",userId);if(error)throw error;}
  static async toggle(userId:string,id:string,completed:boolean){return completed?this.complete(userId,id):this.reopen(userId,id);}
}
