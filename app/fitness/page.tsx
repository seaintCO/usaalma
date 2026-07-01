"use client";

import { useState } from "react";
import { Activity, Dumbbell, Sparkles, Utensils, Droplets, Scale } from "lucide-react";

function cleanText(text:string) {
  return text.replace(/^#{1,6}\s?/gm, "").replace(/\*\*/g, "").replace(/\*/g, "").trim();
}

export default function FitnessPage() {
  const [form, setForm] = useState({
    goal: "Lose fat and build lean muscle",
    weight: "",
    height: "",
    activity: "Moderate",
    diet: "High protein balanced diet",
    equipment: "Gym",
    days: "5",
    notes: "",
  });

  const [plan, setPlan] = useState("");
  const [loading, setLoading] = useState(false);

  async function generatePlan() {
    setLoading(true);
    setPlan("");

    const res = await fetch("/api/fitness/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setPlan(data.plan || data.error || "Could not generate plan.");
    setLoading(false);
  }

  function update(key:string, value:string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <main className="min-h-screen bg-[#F7F7F8] px-4 py-8 text-[#111111] md:px-8">
      <div className="mx-auto max-w-7xl">
        <a href="/dashboard" className="text-sm text-[#6B7280] hover:text-black">← Back to ALMA</a>

        <div className="mt-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-white">
              <Activity className="h-5 w-5" />
            </div>
            <h1 className="text-4xl font-medium tracking-tight md:text-5xl">ALMA Fitness</h1>
            <p className="mt-3 max-w-2xl text-[#6B7280]">
              Meal plans, workouts, macros, groceries, hydration, and progress rules in one place.
            </p>
          </div>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-[1.5rem] border border-[#E5E7EB] bg-white p-5 shadow-sm">
            <Utensils className="mb-4 h-5 w-5" />
            <div className="text-sm text-[#6B7280]">Nutrition</div>
            <div className="mt-1 text-xl font-medium">Meal Plans</div>
          </div>

          <div className="rounded-[1.5rem] border border-[#E5E7EB] bg-white p-5 shadow-sm">
            <Dumbbell className="mb-4 h-5 w-5" />
            <div className="text-sm text-[#6B7280]">Training</div>
            <div className="mt-1 text-xl font-medium">Workouts</div>
          </div>

          <div className="rounded-[1.5rem] border border-[#E5E7EB] bg-white p-5 shadow-sm">
            <Scale className="mb-4 h-5 w-5" />
            <div className="text-sm text-[#6B7280]">Goals</div>
            <div className="mt-1 text-xl font-medium">Macros</div>
          </div>

          <div className="rounded-[1.5rem] border border-[#E5E7EB] bg-black p-5 text-white shadow-sm">
            <Droplets className="mb-4 h-5 w-5" />
            <div className="text-sm text-white/60">Daily Rule</div>
            <div className="mt-1 text-xl font-medium">Hydrate + move</div>
          </div>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[420px_1fr]">
          <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 font-medium">
              <Sparkles className="h-4 w-4" />
              Build your plan
            </div>

            <div className="space-y-3">
              <input value={form.goal} onChange={(e) => update("goal", e.target.value)} placeholder="Goal" className="w-full rounded-2xl bg-[#F7F7F8] p-4 outline-none" />
              <input value={form.weight} onChange={(e) => update("weight", e.target.value)} placeholder="Weight, ex: 180 lbs" className="w-full rounded-2xl bg-[#F7F7F8] p-4 outline-none" />
              <input value={form.height} onChange={(e) => update("height", e.target.value)} placeholder="Height, ex: 5'8" className="w-full rounded-2xl bg-[#F7F7F8] p-4 outline-none" />

              <select value={form.activity} onChange={(e) => update("activity", e.target.value)} className="w-full rounded-2xl bg-[#F7F7F8] p-4 outline-none">
                <option>Low</option>
                <option>Moderate</option>
                <option>High</option>
                <option>Athlete</option>
              </select>

              <input value={form.diet} onChange={(e) => update("diet", e.target.value)} placeholder="Diet preference" className="w-full rounded-2xl bg-[#F7F7F8] p-4 outline-none" />

              <select value={form.equipment} onChange={(e) => update("equipment", e.target.value)} className="w-full rounded-2xl bg-[#F7F7F8] p-4 outline-none">
                <option>Gym</option>
                <option>Home</option>
                <option>Dumbbells only</option>
                <option>Bodyweight only</option>
                <option>Soccer / athlete training</option>
              </select>

              <input value={form.days} onChange={(e) => update("days", e.target.value)} placeholder="Workout days per week" className="w-full rounded-2xl bg-[#F7F7F8] p-4 outline-none" />

              <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Notes: foods you like, injuries, schedule, budget..." className="min-h-28 w-full rounded-2xl bg-[#F7F7F8] p-4 outline-none" />
            </div>

            <button onClick={generatePlan} disabled={loading} className="mt-4 w-full rounded-2xl bg-black px-5 py-4 text-sm font-medium text-white disabled:opacity-50">
              {loading ? "Generating plan..." : "Generate fitness plan"}
            </button>
          </section>

          <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2 font-medium">
              <Sparkles className="h-4 w-4" />
              ALMA Plan
            </div>

            {!plan ? (
              <div className="flex min-h-[500px] items-center justify-center rounded-3xl bg-[#F7F7F8] p-8 text-center text-[#6B7280]">
                Enter your goals and ALMA will generate your meal plan, workout split, macros, grocery list, and progress rules.
              </div>
            ) : (
              <div className="whitespace-pre-wrap rounded-3xl bg-[#F7F7F8] p-6 text-sm leading-7">
                {cleanText(plan)}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
