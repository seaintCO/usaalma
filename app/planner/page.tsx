"use client";

import { CalendarDays, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import AlmaShell from "@/components/alma-shell/AlmaShell";
import type { AlmaShellLanguage } from "@/components/alma-shell/types";
import { DASHBOARD_ROUTE } from "@/lib/platform/workspaceRoutes";

type Item = {
  id: string;
  title: string;
  task_date: string;
  task_time: string;
  status: string;
  category: string;
};

export default function Planner() {
  const [language, setLanguage] = useState<AlmaShellLanguage>("en");
  const [day, setDay] = useState(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<Item[]>([]);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [view, setView] = useState("day");

  const load = async () => {
    const r = await fetch(`/api/planner?from=${day}&to=${day}`);
    if (r.ok) setItems(await r.json());
  };

  useEffect(() => {
    const saved = localStorage.getItem("alma_language");
    if (saved === "en" || saved === "es") setLanguage(saved);
    void load();
  }, [day, view]);

  function updateLanguage(next: AlmaShellLanguage) {
    setLanguage(next);
    localStorage.setItem("alma_language", next);
  }

  const add = async () => {
    if (!title) return;
    await fetch("/api/planner/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, task_date: day, task_time: time }),
    });
    setTitle("");
    void load();
  };

  const complete = async (i: Item) => {
    await fetch(`/api/planner/${i.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: i.status === "completed" ? "scheduled" : "completed",
      }),
    });
    void load();
  };

  return (
    <AlmaShell
      language={language}
      activeWorkspace="planner"
      title="Planner"
      onLanguageChange={updateLanguage}
    >
      <div className="mx-auto max-w-5xl px-4 py-8 text-[#111111]">
        <a href={DASHBOARD_ROUTE} className="text-sm text-[#6B7280]">
          â† Back to ALMA
        </a>
        <section className="mt-8 rounded-[2rem] border bg-white p-6">
          <CalendarDays />
          <h1 className="mt-4 text-4xl font-medium">Planner</h1>
          <div className="mt-5 flex gap-2">
            <input
              type="date"
              value={day}
              onChange={(e) => setDay(e.target.value)}
            />
            {["day", "week", "month"].map((v) => (
              <button key={v} onClick={() => setView(v)}>
                {v}
              </button>
            ))}
          </div>
          <div className="mt-5 flex gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event, meeting, work blockâ€¦"
            />
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
            <button onClick={add}>
              <Plus />
            </button>
          </div>
          <div className="mt-6 space-y-2">
            {items.map((i) => (
              <div
                key={i.id}
                className="flex gap-3 rounded-xl bg-[#F7F7F8] p-4"
              >
                <button onClick={() => complete(i)}>
                  {i.status === "completed" ? "âœ“" : "â—‹"}
                </button>
                <span className="flex-1">
                  {i.title} Â· {i.task_time}
                </span>
                <button
                  onClick={async () => {
                    await fetch(`/api/planner/${i.id}`, { method: "DELETE" });
                    void load();
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AlmaShell>
  );
}
