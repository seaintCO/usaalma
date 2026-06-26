import { TaskRepository } from "@/lib/db/repositories/tasks/task.repository";

export async function createTaskTool(userId:string, title:string) {
  const task = await TaskRepository.create(userId, title);

  return {
    success: true,
    message: `Tarea creada: ${task.title}`,
    task,
  };
}
