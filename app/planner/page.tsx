"use client";

import { useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Clock, Filter, Plus, Trash2 } from "lucide-react";

type Task = {
  id: string;
  title: string;
  date: string;
  time: string;
  category: string;
  priority: "Low" | "Medium" | "High";
  done: boolean;
};

const today = new Date().toISOString().slice(0, 10);

export default function PlannerPage() {
  const [selectedDate, setSelectedDate] = useState(today);
  const [filter, setFilter] = useState("All");

  const [tasks, setTasks] = useState<Task[]>([
    {
      id: crypto.randomUUID(),
      title: "Review business goals",
      date: today,
      time: "09:00",
      category: "Business",
      priority: "High",
      done: false,
    },
    {
      id: crypto.randomUUID(),
      title: "Market review",
      date: today,
      time: "10:30",
      category: "Trading",
      priority: "High",
      done: false,
    },
    {
      id: crypto.randomUUID(),
      title: "Workout",
      date: today,
      time: "18:00",
      category: "Personal",
      priority: "Medium",
      done: false,
    },
  ]);

  const [newTask, setNewTask] = useState({
    title: "",
    date: today,
    time: "",
    category: "Business",
    priority: "Medium" as Task["priority"],
  });

  const days = useMemo(() => {
    return Array.from({ length: 14 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return {
        iso: d.toISOString().slice(0, 10),
        day: d.toLocaleDateString("en-US", { weekday: "short" }),
        date: d.getDate(),
        month: d.toLocaleDateString("en-US", { month: "short" }),
      };
    });
  }, []);

  const filteredTasks = tasks
    .filter((task) => task.date === selectedDate)
    .filter((task) => filter === "All" || task.category === filter)
    .sort((a, b) => a.time.localeCompare(b.time));

  const completed = filteredTasks.filter((t) => t.done).length;
  const progress = filteredTasks.length ? Math.round((completed / filteredTasks.length) * 100) : 0;

  function addTask() {
    if (!newTask.title.trim()) return;

    setTasks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title: newTask.title,
        date: newTask.date,
        time: newTask.time || "Anytime",
        category: newTask.category,
        priority: newTask.priority,
        done: false,
      },
    ]);

    setNewTask({
      title: "",
      date: selectedDate,
      time: "",
      category: "Business",
      priority: "Medium",
    });
  }

  function toggleTask(id: string) {
    setTasks((prev) =>
      prev.map((task) => task.id === id ? { ...task, done: !task.done } : task)
    );
  }

  function deleteTask(id: string) {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  }

  const categories = ["All", "Business", "Trading", "Personal", "Faith", "Family"];

  return (
    <main className="min-h-screen bg-[#F7F7F8] px-4 py-8 text-[#111111] md:px-8">
      <div className="mx-auto max-w-7xl">
        <a href="/dashboard" className="text-sm text-[#6B7280] hover:text-black">
          ← Back to ALMA
        </a>

        <div className="mt-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white">
              <CalendarDays className="h-5 w-5" />
            </div>
            <h1 className="text-4xl font-medium tracking-tight md:text-5xl">Planner</h1>
            <p className="mt-3 max-w-2xl text-[#6B7280]">
              Plan your day, organize tasks, and keep your life and business moving.
            </p>
          </div>

          <div className="rounded-full border border-[#E5E7EB] bg-white px-5 py-3 text-sm">
            {progress}% complete
          </div>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-[1.5rem] border border-[#E5E7EB] bg-white p-5 shadow-sm">
            <div className="text-sm text-[#6B7280]">Today</div>
            <div className="mt-2 text-3xl font-medium">{filteredTasks.length}</div>
            <div className="mt-1 text-sm text-[#6B7280]">scheduled items</div>
          </div>

          <div className="rounded-[1.5rem] border border-[#E5E7EB] bg-white p-5 shadow-sm">
            <div className="text-sm text-[#6B7280]">Completed</div>
            <div className="mt-2 text-3xl font-medium">{completed}</div>
            <div className="mt-1 text-sm text-[#6B7280]">finished tasks</div>
          </div>

          <div className="rounded-[1.5rem] border border-[#E5E7EB] bg-white p-5 shadow-sm">
            <div className="text-sm text-[#6B7280]">High Priority</div>
            <div className="mt-2 text-3xl font-medium">
              {filteredTasks.filter((t) => t.priority === "High" && !t.done).length}
            </div>
            <div className="mt-1 text-sm text-[#6B7280]">need focus</div>
          </div>

          <div className="rounded-[1.5rem] border border-[#E5E7EB] bg-black p-5 text-white shadow-sm">
            <div className="text-sm text-white/60">Daily Focus</div>
            <div className="mt-2 text-lg font-medium">Win the top 3 tasks first.</div>
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-[#E5E7EB] bg-white p-4 shadow-sm">
          <div className="flex gap-3 overflow-x-auto pb-2">
            {days.map((day) => (
              <button
                key={day.iso}
                onClick={() => {
                  setSelectedDate(day.iso);
                  setNewTask((prev) => ({ ...prev, date: day.iso }));
                }}
                className={
                  selectedDate === day.iso
                    ? "min-w-24 rounded-2xl bg-black px-4 py-4 text-white"
                    : "min-w-24 rounded-2xl bg-[#F7F7F8] px-4 py-4 text-[#6B7280] hover:text-black"
                }
              >
                <div className="text-xs">{day.month}</div>
                <div className="text-2xl font-medium">{day.date}</div>
                <div className="text-xs">{day.day}</div>
              </button>
            ))}
          </div>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[420px_1fr]">
          <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 font-medium">
              <Plus className="h-4 w-4" />
              Add to planner
            </div>

            <input
              value={newTask.title}
              onChange={(e) => setNewTask((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Task, reminder, meeting, or goal"
              className="w-full rounded-2xl bg-[#F7F7F8] p-4 outline-none"
            />

            <div className="mt-3 grid grid-cols-2 gap-3">
              <input
                type="date"
                value={newTask.date}
                onChange={(e) => setNewTask((prev) => ({ ...prev, date: e.target.value }))}
                className="rounded-2xl bg-[#F7F7F8] p-4 outline-none"
              />

              <input
                type="time"
                value={newTask.time}
                onChange={(e) => setNewTask((prev) => ({ ...prev, time: e.target.value }))}
                className="rounded-2xl bg-[#F7F7F8] p-4 outline-none"
              />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <select
                value={newTask.category}
                onChange={(e) => setNewTask((prev) => ({ ...prev, category: e.target.value }))}
                className="rounded-2xl bg-[#F7F7F8] p-4 outline-none"
              >
                <option>Business</option>
                <option>Trading</option>
                <option>Personal</option>
                <option>Faith</option>
                <option>Family</option>
              </select>

              <select
                value={newTask.priority}
                onChange={(e) => setNewTask((prev) => ({ ...prev, priority: e.target.value as Task["priority"] }))}
                className="rounded-2xl bg-[#F7F7F8] p-4 outline-none"
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>

            <button
              onClick={addTask}
              className="mt-4 w-full rounded-2xl bg-black px-5 py-4 text-sm font-medium text-white"
            >
              Add task
            </button>

            <div className="mt-8 rounded-3xl bg-[#F7F7F8] p-5">
              <div className="mb-3 flex items-center gap-2 font-medium">
                <Clock className="h-4 w-4" />
                Smart routine blocks
              </div>

              <div className="space-y-3 text-sm text-[#6B7280]">
                <button onClick={() => setNewTask({ title: "Daily market briefing", date: selectedDate, time: "08:30", category: "Trading", priority: "High" })} className="block w-full text-left hover:text-black">
                  Market briefing at 8:30 AM
                </button>
                <button onClick={() => setNewTask({ title: "Client follow-ups", date: selectedDate, time: "11:00", category: "Business", priority: "Medium" })} className="block w-full text-left hover:text-black">
                  Client follow-ups
                </button>
                <button onClick={() => setNewTask({ title: "Bible study prep", date: selectedDate, time: "18:00", category: "Faith", priority: "Medium" })} className="block w-full text-left hover:text-black">
                  Bible study prep
                </button>
                <button onClick={() => setNewTask({ title: "Workout", date: selectedDate, time: "19:00", category: "Personal", priority: "Medium" })} className="block w-full text-left hover:text-black">
                  Workout block
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h2 className="text-2xl font-medium tracking-tight">Schedule</h2>
                <p className="text-sm text-[#6B7280]">{selectedDate}</p>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto">
                <Filter className="h-4 w-4 text-[#6B7280]" />
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilter(cat)}
                    className={
                      filter === cat
                        ? "rounded-full bg-black px-4 py-2 text-sm text-white"
                        : "rounded-full border border-[#E5E7EB] px-4 py-2 text-sm text-[#6B7280] hover:text-black"
                    }
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {filteredTasks.length === 0 ? (
                <div className="flex min-h-[360px] items-center justify-center rounded-3xl bg-[#F7F7F8] p-8 text-center text-[#6B7280]">
                  Nothing scheduled for this day.
                </div>
              ) : (
                filteredTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-4 rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-sm"
                  >
                    <button
                      onClick={() => toggleTask(task.id)}
                      className={
                        task.done
                          ? "flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-700"
                          : "flex h-10 w-10 items-center justify-center rounded-full bg-[#F7F7F8] text-[#6B7280]"
                      }
                    >
                      <CheckCircle2 className="h-5 w-5" />
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className={task.done ? "font-medium text-[#6B7280] line-through" : "font-medium"}>
                        {task.title}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-[#6B7280]">
                        <span>{task.time}</span>
                        <span>•</span>
                        <span>{task.category}</span>
                        <span>•</span>
                        <span>{task.priority} priority</span>
                      </div>
                    </div>

                    <button onClick={() => deleteTask(task.id)} className="text-[#6B7280] hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
