"use client";

import { CheckCircle2, Plus } from "lucide-react";
import { useEffect, useState } from "react";

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [title, setTitle] = useState("");

  async function loadTasks() {
    const res = await fetch("/api/tasks/list");
    const data = await res.json();
    if (Array.isArray(data)) setTasks(data);
  }

  async function createTask() {
    if (!title.trim()) return;

    await fetch("/api/tasks/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });

    setTitle("");
    loadTasks();
  }

  async function toggleTask(task:any) {
    await fetch("/api/tasks/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: task.id, completed: !task.completed }),
    });

    loadTasks();
  }

  useEffect(() => {
    loadTasks();
  }, []);

  return (
    <main className="min-h-screen bg-[#F7F7F8] px-4 py-8 text-[#111111] md:px-6 md:py-10">
      <div className="mx-auto max-w-4xl">
        <a href="/dashboard" className="text-sm text-[#6B7280] hover:text-black">
          ← Volver a ALMA
        </a>

        <div className="mt-8 rounded-[2rem] border border-[#E5E7EB] bg-white p-6 md:p-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8]">
            <CheckCircle2 className="h-5 w-5" />
          </div>

          <h1 className="text-4xl font-medium tracking-tight">Tasks</h1>
          <p className="mt-4 text-[#6B7280]">
            Organiza prioridades, recordatorios y pendientes.
          </p>

          <div className="mt-8 flex gap-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createTask();
              }}
              className="flex-1 rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-3 outline-none"
              placeholder="Agregar nueva tarea..."
            />
            <button onClick={createTask} className="rounded-2xl bg-black px-5 text-white">
              <Plus className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-8 space-y-3">
            {tasks.length === 0 ? (
              <div className="rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] p-5 text-sm text-[#6B7280]">
                No tienes tareas todavía.
              </div>
            ) : (
              tasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => toggleTask(task)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] p-4 text-left"
                >
                  <div
                    className={
                      task.completed
                        ? "flex h-5 w-5 items-center justify-center rounded-full bg-black text-white"
                        : "h-5 w-5 rounded-full border border-[#6B7280]"
                    }
                  >
                    {task.completed && <CheckCircle2 className="h-3 w-3" />}
                  </div>
                  <span className={task.completed ? "text-sm text-[#6B7280] line-through" : "text-sm"}>
                    {task.title}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
