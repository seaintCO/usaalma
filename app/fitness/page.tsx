"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Camera, Download, Dumbbell, Plus, Save, Sparkles, Utensils } from "lucide-react";

function cleanText(text:string) {
  return text.replace(/^#{1,6}\s?/gm, "").replace(/\*\*/g, "").replace(/\*/g, "").trim();
}

export default function FitnessPage() {
  const photoRef = useRef<HTMLInputElement | null>(null);

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
  const [plans, setPlans] = useState<any[]>([]);
  const [foods, setFoods] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [foodLoading, setFoodLoading] = useState(false);

  const [manualFood, setManualFood] = useState({
    food_name:"",
    calories:"",
    protein:"",
    carbs:"",
    fats:"",
    meal_type:"Meal",
  });

  const dailyCalories = foods.reduce((sum, f) => sum + Number(f.calories || 0), 0);
  const dailyProtein = foods.reduce((sum, f) => sum + Number(f.protein || 0), 0);
  const calorieGoal = 2200;
  const proteinGoal = 180;

  const calorieProgress = Math.min(100, Math.round((dailyCalories / calorieGoal) * 100));
  const proteinProgress = Math.min(100, Math.round((dailyProtein / proteinGoal) * 100));

  async function loadSaved() {
    const plansRes = await fetch("/api/fitness/plans");
    const plansData = await plansRes.json();
    setPlans(plansData.plans || []);

    const foodsRes = await fetch("/api/fitness/foods");
    const foodsData = await foodsRes.json();
    setFoods(foodsData.foods || []);
  }

  useEffect(() => {
    loadSaved();
  }, []);

  async function generatePlan() {
    setLoading(true);
    setPlan("");

    const res = await fetch("/api/fitness/generate", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify(form),
    });

    const data = await res.json();
    setPlan(data.plan || data.error || "Could not generate plan.");
    setLoading(false);
  }

  async function savePlan() {
    if (!plan) return alert("Generate a plan first.");

    const res = await fetch("/api/fitness/plans", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({
        title:`${form.goal} Plan`,
        goal:form.goal,
        calories:calorieGoal,
        protein:proteinGoal,
        carbs:0,
        fats:0,
        plan_text:plan,
      }),
    });

    const data = await res.json();
    if (data.success) {
      alert("Plan saved.");
      loadSaved();
    } else {
      alert(data.error || "Could not save plan.");
    }
  }

  async function addToPlanner() {
    if (!plan) return alert("Generate a plan first.");

    const res = await fetch("/api/planner/add", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({
        title:`Fitness plan: ${form.goal}`,
        notes:plan,
        category:"Fitness",
        priority:"High",
      }),
    });

    const data = await res.json();
    alert(data.success ? "Added to planner." : data.error || "Could not add to planner.");
  }

  function downloadPlan() {
    if (!plan) return;

    const blob = new Blob([cleanText(plan)], { type:"text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "alma-fitness-plan.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function addFood(food:any = manualFood) {
    if (!food.food_name) return;

    const res = await fetch("/api/fitness/foods", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify(food),
    });

    const data = await res.json();
    if (data.success) {
      setManualFood({ food_name:"", calories:"", protein:"", carbs:"", fats:"", meal_type:"Meal" });
      loadSaved();
    } else {
      alert(data.error || "Could not save food.");
    }
  }

  async function analyzeFoodPhoto(file:File | undefined) {
    if (!file) return;

    setFoodLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/fitness/photo", {
      method:"POST",
      body:formData,
    });

    const data = await res.json();
    setFoodLoading(false);

    if (data.estimate) {
      const ok = confirm(`${data.estimate.food_name}\nCalories: ${data.estimate.calories}\nProtein: ${data.estimate.protein}g\n\nSave this food?`);
      if (ok) addFood({ ...data.estimate, meal_type:"Photo Meal" });
    } else {
      alert(data.error || "Could not analyze photo.");
    }
  }

  function update(key:string, value:string) {
    setForm((prev) => ({ ...prev, [key]:value }));
  }

  return (
    <main className="min-h-screen bg-[#F7F7F8] px-4 py-8 text-[#111111] md:px-8">
      <div className="mx-auto max-w-7xl">
        <a href="/dashboard" className="text-sm text-[#6B7280] hover:text-black">← Back to ALMA</a>

        <div className="mt-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-white">
            <Activity className="h-5 w-5" />
          </div>
          <h1 className="text-4xl font-medium tracking-tight md:text-5xl">ALMA Fitness</h1>
          <p className="mt-3 max-w-2xl text-[#6B7280]">Meal plans, workouts, macros, saved plans, food logging, weekly goals, and photo calorie estimates.</p>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-[1.5rem] border border-[#E5E7EB] bg-white p-5">
            <div className="text-sm text-[#6B7280]">Calories Today</div>
            <div className="mt-2 text-3xl font-medium">{dailyCalories}</div>
            <div className="mt-3 h-2 rounded-full bg-[#F7F7F8]"><div className="h-2 rounded-full bg-black" style={{ width:`${calorieProgress}%` }} /></div>
            <div className="mt-2 text-xs text-[#6B7280]">Goal: {calorieGoal}</div>
          </div>

          <div className="rounded-[1.5rem] border border-[#E5E7EB] bg-white p-5">
            <div className="text-sm text-[#6B7280]">Protein Today</div>
            <div className="mt-2 text-3xl font-medium">{dailyProtein}g</div>
            <div className="mt-3 h-2 rounded-full bg-[#F7F7F8]"><div className="h-2 rounded-full bg-black" style={{ width:`${proteinProgress}%` }} /></div>
            <div className="mt-2 text-xs text-[#6B7280]">Goal: {proteinGoal}g</div>
          </div>

          <div className="rounded-[1.5rem] border border-[#E5E7EB] bg-white p-5">
            <div className="text-sm text-[#6B7280]">Saved Plans</div>
            <div className="mt-2 text-3xl font-medium">{plans.length}</div>
          </div>

          <div className="rounded-[1.5rem] bg-black p-5 text-white">
            <div className="text-sm text-white/60">Weekly Goal</div>
            <div className="mt-2 text-xl font-medium">Hit calories, protein, and workouts 5x.</div>
          </div>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[420px_1fr]">
          <section className="space-y-6">
            <div className="rounded-[2rem] border border-[#E5E7EB] bg-white p-5">
              <div className="mb-4 flex items-center gap-2 font-medium"><Sparkles className="h-4 w-4" />Build your plan</div>

              <div className="space-y-3">
                <input value={form.goal} onChange={(e) => update("goal", e.target.value)} placeholder="Goal" className="w-full rounded-2xl bg-[#F7F7F8] p-4 outline-none" />
                <input value={form.weight} onChange={(e) => update("weight", e.target.value)} placeholder="Weight" className="w-full rounded-2xl bg-[#F7F7F8] p-4 outline-none" />
                <input value={form.height} onChange={(e) => update("height", e.target.value)} placeholder="Height" className="w-full rounded-2xl bg-[#F7F7F8] p-4 outline-none" />
                <input value={form.diet} onChange={(e) => update("diet", e.target.value)} placeholder="Diet preference" className="w-full rounded-2xl bg-[#F7F7F8] p-4 outline-none" />
                <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Notes, schedule, injuries, foods you like..." className="min-h-24 w-full rounded-2xl bg-[#F7F7F8] p-4 outline-none" />
              </div>

              <button onClick={generatePlan} disabled={loading} className="mt-4 w-full rounded-2xl bg-black px-5 py-4 text-sm font-medium text-white disabled:opacity-50">
                {loading ? "Generating..." : "Generate fitness plan"}
              </button>
            </div>

            <div className="rounded-[2rem] border border-[#E5E7EB] bg-white p-5">
              <div className="mb-4 flex items-center gap-2 font-medium"><Utensils className="h-4 w-4" />Food log</div>

              <input ref={photoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => analyzeFoodPhoto(e.target.files?.[0])} />

              <button onClick={() => photoRef.current?.click()} className="mb-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-4 text-sm font-medium">
                <Camera className="h-4 w-4" />
                {foodLoading ? "Analyzing meal..." : "Take food photo"}
              </button>

              <div className="grid grid-cols-2 gap-3">
                <input value={manualFood.food_name} onChange={(e) => setManualFood((p) => ({ ...p, food_name:e.target.value }))} placeholder="Food" className="rounded-2xl bg-[#F7F7F8] p-4 outline-none" />
                <input value={manualFood.calories} onChange={(e) => setManualFood((p) => ({ ...p, calories:e.target.value }))} placeholder="Calories" className="rounded-2xl bg-[#F7F7F8] p-4 outline-none" />
                <input value={manualFood.protein} onChange={(e) => setManualFood((p) => ({ ...p, protein:e.target.value }))} placeholder="Protein" className="rounded-2xl bg-[#F7F7F8] p-4 outline-none" />
                <input value={manualFood.carbs} onChange={(e) => setManualFood((p) => ({ ...p, carbs:e.target.value }))} placeholder="Carbs" className="rounded-2xl bg-[#F7F7F8] p-4 outline-none" />
              </div>

              <button onClick={() => addFood()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-black px-5 py-4 text-sm font-medium text-white">
                <Plus className="h-4 w-4" /> Save food
              </button>
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6">
              <div className="mb-4 flex flex-wrap gap-2">
                <button onClick={savePlan} className="flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm text-white"><Save className="h-4 w-4" />Save</button>
                <button onClick={downloadPlan} className="flex items-center gap-2 rounded-full border border-[#E5E7EB] px-4 py-2 text-sm"><Download className="h-4 w-4" />Download</button>
                <button onClick={addToPlanner} className="flex items-center gap-2 rounded-full border border-[#E5E7EB] px-4 py-2 text-sm"><Dumbbell className="h-4 w-4" />Add to Planner</button>
              </div>

              {!plan ? (
                <div className="flex min-h-[420px] items-center justify-center rounded-3xl bg-[#F7F7F8] p-8 text-center text-[#6B7280]">
                  Generate a plan, then save it, download it, or add it to your ALMA Planner.
                </div>
              ) : (
                <div className="whitespace-pre-wrap rounded-3xl bg-[#F7F7F8] p-6 text-sm leading-7">{cleanText(plan)}</div>
              )}
            </div>

            <div className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6">
              <h2 className="mb-4 font-medium">Saved Food</h2>
              <div className="space-y-3">
                {foods.map((food) => (
                  <div key={food.id} className="flex justify-between rounded-2xl bg-[#F7F7F8] p-4 text-sm">
                    <div>
                      <div className="font-medium">{food.food_name}</div>
                      <div className="text-[#6B7280]">{food.protein || 0}g protein · {food.carbs || 0}g carbs</div>
                    </div>
                    <div className="font-medium">{food.calories} cal</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6">
              <h2 className="mb-4 font-medium">Saved Plans</h2>
              <div className="space-y-3">
                {plans.map((saved) => (
                  <button key={saved.id} onClick={() => setPlan(saved.plan_text)} className="block w-full rounded-2xl bg-[#F7F7F8] p-4 text-left text-sm hover:bg-white">
                    <div className="font-medium">{saved.title}</div>
                    <div className="text-[#6B7280]">{new Date(saved.created_at).toLocaleDateString()}</div>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
