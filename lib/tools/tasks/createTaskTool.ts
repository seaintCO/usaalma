import { TaskRepository } from "@/lib/db/repositories/tasks/task.repository";

export async function createTaskTool(userId:string, input:{ title:string; description?:string; priority?:"low"|"medium"|"high"|"urgent"; dueAt?:string; sourceExecutionId?:string }) {
  const task = await TaskRepository.createForChat(userId, { ...input, source:"alma_chat" });

  return {
    success: true,
    message: `Tarea creada: ${task.title}`,
    task,
  };
}
