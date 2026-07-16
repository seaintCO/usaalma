"use client";

import { CalendarDays, CheckCircle2, Circle, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import AlmaShell from "@/components/alma-shell/AlmaShell";
import type { AlmaShellLanguage } from "@/components/alma-shell/types";

type Item = {
  id: string;
  title: string;
  task_date: string;
  task_time: string;
  status: string;
  category: string;
};

function readStoredLanguage(): AlmaShellLanguage {
  if (typeof window === "undefined") return "en";
  const saved = window.localStorage.getItem("alma_language");
  return saved === "en" || saved === "es" ? saved : "en";
}

const copy = {
  en: {
    title: "Planner",
    placeholder: "Event, meeting, work block...",
    empty: "No planner items yet.",
  },
  es: {
    title: "Planificador",
    placeholder: "Evento, reunión o bloque de trabajo...",
    empty: "Aún no hay elementos.",
  },
};

export default function Planner() {
  const [language, setLanguage] =
    useState<AlmaShellLanguage>(readStoredLanguage);
  const [day, setDay] = useState(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<Item[]>([]);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [view, setView] = useState("day");
  const t = copy[language];

  const load = async () => {
    const r = await fetch(`/api/planner?from=${day}&to=${day}`);
    if (r.ok) setItems(await r.json());
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      title={t.title}
      onLanguageChange={updateLanguage}
    >
      <div className="mx-auto w-full max-w-5xl px-3 py-4 text-[#111111] md:px-4 md:py-8">
        <section className="rounded-2xl border bg-white p-4 md:rounded-[2rem] md:p-6">
          <CalendarDays className="h-7 w-7" />
          <h1 className="mt-4 text-4xl font-medium">{t.title}</h1>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className="min-w-0 rounded-xl border border-[#E5E7EB] bg-[#F7F7F8] px-3 py-2"
            />
            {["day", "week", "month"].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={
                  view === v
                    ? "rounded-full bg-black px-3 py-2 text-sm text-white"
                    : "rounded-full border border-[#E5E7EB] px-3 py-2 text-sm"
                }
              >
                {v}
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.placeholder}
              className="min-w-0 rounded-xl bg-[#F7F7F8] px-3 py-3 outline-none"
            />
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="min-w-0 rounded-xl bg-[#F7F7F8] px-3 py-3"
            />
            <button
              onClick={add}
              className="flex items-center justify-center rounded-xl bg-black px-4 py-3 text-white"
              aria-label="Add planner item"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-6 space-y-2">
            {items.length ? (
              items.map((i) => (
                <div
                  key={i.id}
                  className="flex items-center gap-3 rounded-xl bg-[#F7F7F8] p-3 md:p-4"
                >
                  <button onClick={() => complete(i)} className="shrink-0">
                    {i.status === "completed" ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Circle className="h-5 w-5" />
                    )}
                  </button>
                  <span className="min-w-0 flex-1 truncate">
                    {i.title}
                    {i.task_time ? ` · ${i.task_time}` : ""}
                  </span>
                  <button
                    className="shrink-0"
                    onClick={async () => {
                      await fetch(`/api/planner/${i.id}`, {
                        method: "DELETE",
                      });
                      void load();
                    }}
                    aria-label="Delete planner item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            ) : (
              <p className="rounded-xl bg-[#F7F7F8] p-4 text-sm text-[#6B7280]">
                {t.empty}
              </p>
            )}
          </div>
        </section>
      </div>
    </AlmaShell>
  );
}
