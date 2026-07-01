"use client";

import { useEffect, useRef, useState } from "react";
import {
  Activity,
  Camera,
  Download,
  Dumbbell,
  Plus,
  Save,
  Sparkles,
  Utensils,
  Star,
} from "lucide-react";

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
  const [favorites, setFavorites] = useState<any[]>([]);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [goals, setGoals] = useState<any>({
    daily_calories: 2200,
    daily_protein: 180,
    weekly_weight_goal: "Maintain",
    water_goal_oz: 100,
    workout_days: 5,
  });

  const [foodSearch, setFoodSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [groceryList, setGroceryList] = useState("");
  const [coachAdvice, setCoachAdvice] = useState("");
  const [loading, setLoading] = useState(false);
  const [foodLoading, setFoodLoading] = useState(false);

  const [manualFood, setManualFood] = useState({
    food_name: "",
    calories: "",
    protein: "",
    carbs: "",
    fats: "",
    meal_type: "Meal",
  });

  const dailyCalories = foods.reduce((sum, f) => sum + Number(f.calories || 0), 0);
  const dailyProtein = foods.reduce((sum, f) => sum + Number(f.protein || 0), 0);
  const dailyCarbs = foods.reduce((sum, f) => sum + Number(f.carbs || 0), 0);
  const dailyFats = foods.reduce((sum, f) => sum + Number(f.fats || 0), 0);

  const calorieGoal = Number(goals.daily_calories || 2200);
  const proteinGoal = Number(goals.daily_protein || 180);

  const calorieProgress = Math.min(100, Math.round((dailyCalories / calorieGoal) * 100));
  const proteinProgress = Math.min(100, Math.round((dailyProtein / proteinGoal) * 100));

  async function loadSaved() {
    const goalsRes = await fetch("/api/fitness/goals");
    const goalsData = await goalsRes.json();
    setGoals(goalsData.goal || goals);

    const plansRes = await fetch("/api/fitness/plans");
    const plansData = await plansRes.json();
    setPlans(plansData.plans || []);

    const foodsRes = await fetch("/api/fitness/foods");
    const foodsData = await foodsRes.json();
    setFoods(foodsData.foods || []);

    const favRes = await fetch("/api/fitness/favorites");
    const favData = await favRes.json();
    setFavorites(favData.favorites || []);

    const measureRes = await fetch("/api/fitness/measurements");
    const measureData = await measureRes.json();
    setMeasurements(measureData.measurements || []);
  }

  useEffect(() => {
    loadSaved();
  }, []);

  function update(key:string, value:string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function generatePlan() {
    setLoading(true);
    setPlan("");

    const res = await fetch("/api/fitness/generate", {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setPlan(data.plan || data.error || "Could not generate plan.");
    setLoading(false);
  }

  async function savePlan() {
    if (!plan) return alert("Generate a plan first.");

    const res = await fetch("/api/fitness/plans", {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({
        title: `${form.goal} Plan`,
        goal: form.goal,
        calories: calorieGoal,
        protein: proteinGoal,
        carbs: dailyCarbs,
        fats: dailyFats,
        plan_text: plan,
      }),
    });

    const data = await res.json();
    alert(data.success ? "Plan saved." : data.error || "Could not save plan.");
    loadSaved();
  }

  async function saveGoals() {
    const res = await fetch("/api/fitness/goals", {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify(goals),
    });

    const data = await res.json();
    alert(data.success ? "Goals saved." : data.error || "Could not save goals.");
    loadSaved();
  }

  async function addToPlanner() {
    if (!plan) return alert("Generate a plan first.");

    const res = await fetch("/api/planner/add", {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({
        title: `Fitness plan: ${form.goal}`,
        notes: plan,
        category: "Fitness",
        priority: "High",
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

  async function searchFood() {
    if (!foodSearch.trim()) return;

    const res = await fetch(`/api/fitness/search-food?q=${encodeURIComponent(foodSearch)}`);
    const data = await res.json();
    setSearchResults(data.foods || []);
  }

  async function addFood(food:any = manualFood) {
    if (!food.food_name) return;

    const res = await fetch("/api/fitness/foods", {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify(food),
    });

    const data = await res.json();

    if (data.success) {
      setManualFood({ food_name:"", calories:"", protein:"", carbs:"", fats:"", meal_type:"Meal" });
      loadSaved();
    } else {
      alert(data.error || "Could not save food.");
    }
  }

  async function saveFavorite(food:any) {
    const res = await fetch("/api/fitness/favorites", {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify(food),
    });

    const data = await res.json();
    alert(data.success ? "Saved to favorites." : data.error || "Could not save favorite.");
    loadSaved();
  }

  async function analyzeFoodPhoto(file:File | undefined) {
    if (!file) return;

    setFoodLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/fitness/photo", {
      method: "POST",
      body: formData,
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

  async function generateGroceryList() {
    if (!plan) return alert("Generate a plan first.");

    const res = await fetch("/api/fitness/grocery-list", {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ plan }),
    });

    const data = await res.json();
    setGroceryList(data.grocery || data.error || "Could not generate grocery list.");
  }

  async function getCoachAdvice() {
    const res = await fetch("/api/fitness/coach", {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({
        dailyCalories,
        dailyProtein,
        calorieGoal,
        proteinGoal,
        weight: measurements.at(-1)?.weight,
        goal: form.goal,
      }),
    });

    const data = await res.json();
    setCoachAdvice(data.advice || data.error || "Could not generate coach advice.");
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
          <p className="mt-3 max-w-2xl text-[#6B7280]">
            Meal plans, workouts, macros, saved plans, food logging, weekly goals, photo calorie estimates, and AI coaching.
          </p>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-[1.5rem] border border-[#E5E7EB] bg-white p-5">
            <div className="text-sm text-[#6B7280]">Calories Today</div>
            <div className="mt-2 text-3xl font-medium">{dailyCalories}</div>
            <div className="mt-3 h-2 rounded-full bg-[#F7F7F8]">
              <div className="h-2 rounded-full bg-black" style={{ width:`${calorieProgress}%` }} />
            </div>
            <div className="mt-2 text-xs text-[#6B7280]">Goal: {calorieGoal}</div>
          </div>

          <div className="rounded-[1.5rem] border border-[#E5E7EB] bg-white p-5">
            <div className="text-sm text-[#6B7280]">Protein Today</div>
            <div className="mt-2 text-3xl font-medium">{dailyProtein}g</div>
            <div className="mt-3 h-2 rounded-full bg-[#F7F7F8]">
              <div className="h-2 rounded-full bg-black" style={{ width:`${proteinProgress}%` }} />
            </div>
            <div className="mt-2 text-xs text-[#6B7280]">Goal: {proteinGoal}g</div>
          </div>

          <div className="rounded-[1.5rem] border border-[#E5E7EB] bg-white p-5">
            <div className="text-sm text-[#6B7280]">Macros</div>
            <div className="mt-2 text-xl font-medium">{dailyCarbs}g carbs</div>
            <div className="text-sm text-[#6B7280]">{dailyFats}g fat</div>
          </div>

          <div className="rounded-[1.5rem] bg-black p-5 text-white">
            <div className="text-sm text-white/60">Weekly Goal</div>
            <div className="mt-2 text-xl font-medium">{goals.weekly_weight_goal}</div>
            <div className="mt-2 text-sm text-white/60">{goals.workout_days} workouts · {goals.water_goal_oz}oz water</div>
          </div>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[420px_1fr]">
          <section className="space-y-6">
            <div className="rounded-[2rem] border border-[#E5E7EB] bg-white p-5">
              <div className="mb-4 flex items-center gap-2 font-medium">
                <Sparkles className="h-4 w-4" />
                Fitness Goals
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input value={goals.daily_calories} onChange={(e) => setGoals((p:any) => ({ ...p, daily_calories:e.target.value }))} placeholder="Daily calories" className="rounded-2xl bg-[#F7F7F8] p-4 outline-none" />
                <input value={goals.daily_protein} onChange={(e) => setGoals((p:any) => ({ ...p, daily_protein:e.target.value }))} placeholder="Daily protein" className="rounded-2xl bg-[#F7F7F8] p-4 outline-none" />
                <input value={goals.water_goal_oz} onChange={(e) => setGoals((p:any) => ({ ...p, water_goal_oz:e.target.value }))} placeholder="Water oz" className="rounded-2xl bg-[#F7F7F8] p-4 outline-none" />
                <input value={goals.workout_days} onChange={(e) => setGoals((p:any) => ({ ...p, workout_days:e.target.value }))} placeholder="Workout days" className="rounded-2xl bg-[#F7F7F8] p-4 outline-none" />
              </div>

              <input value={goals.weekly_weight_goal} onChange={(e) => setGoals((p:any) => ({ ...p, weekly_weight_goal:e.target.value }))} placeholder="Weekly goal" className="mt-3 w-full rounded-2xl bg-[#F7F7F8] p-4 outline-none" />

              <button onClick={saveGoals} className="mt-3 w-full rounded-2xl bg-black px-5 py-4 text-sm font-medium text-white">
                Save goals
              </button>
            </div>

            <div className="rounded-[2rem] border border-[#E5E7EB] bg-white p-5">
              <div className="mb-4 flex items-center gap-2 font-medium">
                <Utensils className="h-4 w-4" />
                Food Log
              </div>

              <input ref={photoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => analyzeFoodPhoto(e.target.files?.[0])} />

              <button onClick={() => photoRef.current?.click()} className="mb-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-4 text-sm font-medium">
                <Camera className="h-4 w-4" />
                {foodLoading ? "Analyzing meal..." : "Take food photo"}
              </button>

              <div className="mb-3 flex gap-2">
                <input value={foodSearch} onChange={(e) => setFoodSearch(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") searchFood(); }} placeholder="Search food..." className="min-w-0 flex-1 rounded-2xl bg-[#F7F7F8] p-4 outline-none" />
                <button onClick={searchFood} className="rounded-2xl bg-black px-4 text-sm font-medium text-white">Search</button>
              </div>

              {searchResults.length > 0 && (
                <div className="mb-4 max-h-72 space-y-2 overflow-y-auto rounded-2xl bg-[#F7F7F8] p-2">
                  {searchResults.map((food) => (
                    <div key={food.fdcId} className="rounded-xl bg-white p-3 text-sm">
                      <button onClick={() => addFood(food)} className="block w-full text-left">
                        <div className="font-medium">{food.food_name}</div>
                        <div className="text-xs text-[#6B7280]">{food.brand} · {food.serving}</div>
                        <div className="mt-1 text-xs">{food.calories} cal · {food.protein}g protein · {food.carbs}g carbs · {food.fats}g fat</div>
                      </button>
                      <button onClick={() => saveFavorite(food)} className="mt-2 flex items-center gap-1 text-xs text-[#6B7280] hover:text-black">
                        <Star className="h-3 w-3" />
                        Save favorite
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <input value={manualFood.food_name} onChange={(e) => setManualFood((p) => ({ ...p, food_name:e.target.value }))} placeholder="Food" className="rounded-2xl bg-[#F7F7F8] p-4 outline-none" />
                <input value={manualFood.calories} onChange={(e) => setManualFood((p) => ({ ...p, calories:e.target.value }))} placeholder="Calories" className="rounded-2xl bg-[#F7F7F8] p-4 outline-none" />
                <input value={manualFood.protein} onChange={(e) => setManualFood((p) => ({ ...p, protein:e.target.value }))} placeholder="Protein" className="rounded-2xl bg-[#F7F7F8] p-4 outline-none" />
                <input value={manualFood.carbs} onChange={(e) => setManualFood((p) => ({ ...p, carbs:e.target.value }))} placeholder="Carbs" className="rounded-2xl bg-[#F7F7F8] p-4 outline-none" />
              </div>

              <button onClick={() => addFood()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-black px-5 py-4 text-sm font-medium text-white">
                <Plus className="h-4 w-4" />
                Save food
              </button>
            </div>

            <div className="rounded-[2rem] border border-[#E5E7EB] bg-white p-5">
              <div className="mb-4 flex items-center gap-2 font-medium">
                <Sparkles className="h-4 w-4" />
                Build Plan
              </div>

              <div className="space-y-3">
                <input value={form.goal} onChange={(e) => update("goal", e.target.value)} placeholder="Goal" className="w-full rounded-2xl bg-[#F7F7F8] p-4 outline-none" />
                <input value={form.weight} onChange={(e) => update("weight", e.target.value)} placeholder="Weight" className="w-full rounded-2xl bg-[#F7F7F8] p-4 outline-none" />
                <input value={form.height} onChange={(e) => update("height", e.target.value)} placeholder="Height" className="w-full rounded-2xl bg-[#F7F7F8] p-4 outline-none" />
                <input value={form.diet} onChange={(e) => update("diet", e.target.value)} placeholder="Diet preference" className="w-full rounded-2xl bg-[#F7F7F8] p-4 outline-none" />
                <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Notes..." className="min-h-24 w-full rounded-2xl bg-[#F7F7F8] p-4 outline-none" />
              </div>

              <button onClick={generatePlan} disabled={loading} className="mt-4 w-full rounded-2xl bg-black px-5 py-4 text-sm font-medium text-white disabled:opacity-50">
                {loading ? "Generating..." : "Generate fitness plan"}
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
                  Generate a plan, then save it, download it, or add it to Planner.
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
                      <div className="text-[#6B7280]">{food.protein || 0}g protein · {food.carbs || 0}g carbs · {food.fats || 0}g fat</div>
                    </div>
                    <div className="font-medium">{food.calories} cal</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6">
              <h2 className="mb-4 font-medium">Favorites</h2>
              <div className="space-y-3">
                {favorites.map((food) => (
                  <button key={food.id} onClick={() => addFood(food)} className="block w-full rounded-2xl bg-[#F7F7F8] p-4 text-left text-sm hover:bg-white">
                    <div className="font-medium">{food.food_name}</div>
                    <div className="text-[#6B7280]">{food.calories} cal · {food.protein}g protein · {food.carbs}g carbs · {food.fats}g fat</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6">
              <h2 className="mb-4 font-medium">AI Coach</h2>
              <button onClick={getCoachAdvice} className="rounded-full bg-black px-4 py-2 text-sm text-white">Adjust my plan</button>
              {coachAdvice && <div className="mt-4 whitespace-pre-wrap rounded-3xl bg-[#F7F7F8] p-5 text-sm leading-7">{coachAdvice}</div>}
            </div>

            <div className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6">
              <h2 className="mb-4 font-medium">Grocery List</h2>
              <button onClick={generateGroceryList} className="rounded-full bg-black px-4 py-2 text-sm text-white">Generate grocery list</button>
              {groceryList && <div className="mt-4 whitespace-pre-wrap rounded-3xl bg-[#F7F7F8] p-5 text-sm leading-7">{groceryList}</div>}
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
