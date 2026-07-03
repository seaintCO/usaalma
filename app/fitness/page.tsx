"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Plus, Trash2, Edit3, Heart, Save, Sparkles, Target, Apple, Calendar, ShoppingCart } from "lucide-react";

export default function FitnessPage() {
  const [goals, setGoals] = useState<any>({ calories:2200, protein:180, carbs:180, fat:70, weight_goal:"Maintain" });
  const [foods, setFoods] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [manual, setManual] = useState<any>({ food_name:"", calories:"", protein:"", carbs:"", fat:"", serving_qty:1 });
  const [editing, setEditing] = useState<any>(null);
  const [plan, setPlan] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadAll() {
    const [g, f, fav] = await Promise.all([
      fetch("/api/fitness/v2/goals").then(r=>r.json()),
      fetch("/api/fitness/v2/food-log").then(r=>r.json()),
      fetch("/api/fitness/v2/favorites").then(r=>r.json()),
    ]);

    setGoals(g || goals);
    if (Array.isArray(f)) setFoods(f);
    if (Array.isArray(fav)) setFavorites(fav);
  }

  useEffect(() => { loadAll(); }, []);

  const totals = useMemo(() => {
    return foods.reduce((acc:any, item:any) => {
      const qty = Number(item.serving_qty || 1);
      acc.calories += Number(item.calories || 0) * qty;
      acc.protein += Number(item.protein || 0) * qty;
      acc.carbs += Number(item.carbs || 0) * qty;
      acc.fat += Number(item.fat || 0) * qty;
      return acc;
    }, { calories:0, protein:0, carbs:0, fat:0 });
  }, [foods]);

  async function saveGoals() {
    await fetch("/api/fitness/v2/goals", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify(goals),
    });
    alert("Goals saved.");
    loadAll();
  }

  async function searchFood() {
    if (!query.trim()) return;
    setLoading(true);
    const data = await fetch(`/api/fitness/v2/food-search?q=${encodeURIComponent(query)}`).then(r=>r.json());
    setResults(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function addFood(food:any) {
    await fetch("/api/fitness/v2/food-log", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({
        ...food,
        serving_qty:food.serving_qty || 1,
      }),
    });
    setManual({ food_name:"", calories:"", protein:"", carbs:"", fat:"", serving_qty:1 });
    setEditing(null);
    loadAll();
  }

  async function updateFood() {
    if (!editing) return;
    await fetch("/api/fitness/v2/food-log", {
      method:"PATCH",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify(editing),
    });
    setEditing(null);
    loadAll();
  }

  async function deleteFood(id:string) {
    await fetch("/api/fitness/v2/food-log", {
      method:"DELETE",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ id }),
    });
    loadAll();
  }

  async function favoriteFood(food:any) {
    await fetch("/api/fitness/v2/favorites", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify(food),
    });
    loadAll();
  }

  async function removeFavorite(id:string) {
    await fetch("/api/fitness/v2/favorites", {
      method:"DELETE",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ id }),
    });
    loadAll();
  }

  async function generatePlan() {
    setLoading(true);
    const data = await fetch("/api/fitness/v2/meal-plan", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ goals, foods }),
    }).then(r=>r.json());
    setPlan(data.plan || "");
    setLoading(false);
  }

  function pct(value:number, goal:number) {
    if (!goal) return 0;
    return Math.min(100, Math.round((value / goal) * 100));
  }

  return (
    <main className="min-h-screen bg-[#F7F7F8] px-4 py-8 text-[#111111] md:px-6 md:py-10">
      <div className="mx-auto max-w-7xl">
        <a href="/dashboard" className="text-sm text-[#6B7280] hover:text-black">← Back to ALMA</a>

        <div className="mt-8">
          <h1 className="text-4xl font-medium tracking-tight md:text-5xl">Fitness</h1>
          <p className="mt-3 text-[#6B7280]">Food log, goals, meal planning, progress, and AI coaching.</p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[420px_1fr]">
          <section className="space-y-6">
            <div className="rounded-[2rem] border border-[#E5E7EB] bg-white p-5">
              <div className="mb-4 flex items-center gap-2 font-medium"><Target className="h-4 w-4" /> Goals</div>
              <div className="grid grid-cols-2 gap-3">
                <input value={goals.calories} onChange={e=>setGoals({...goals, calories:e.target.value})} placeholder="Calories" className="rounded-2xl bg-[#F7F7F8] px-4 py-3 outline-none" />
                <input value={goals.protein} onChange={e=>setGoals({...goals, protein:e.target.value})} placeholder="Protein" className="rounded-2xl bg-[#F7F7F8] px-4 py-3 outline-none" />
                <input value={goals.carbs} onChange={e=>setGoals({...goals, carbs:e.target.value})} placeholder="Carbs" className="rounded-2xl bg-[#F7F7F8] px-4 py-3 outline-none" />
                <input value={goals.fat} onChange={e=>setGoals({...goals, fat:e.target.value})} placeholder="Fat" className="rounded-2xl bg-[#F7F7F8] px-4 py-3 outline-none" />
              </div>
              <input value={goals.weight_goal} onChange={e=>setGoals({...goals, weight_goal:e.target.value})} placeholder="Weight goal" className="mt-3 w-full rounded-2xl bg-[#F7F7F8] px-4 py-3 outline-none" />
              <button onClick={saveGoals} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-black py-3 text-white"><Save className="h-4 w-4" /> Save goals</button>
            </div>

            <div className="rounded-[2rem] border border-[#E5E7EB] bg-white p-5">
              <div className="mb-4 flex items-center gap-2 font-medium"><Apple className="h-4 w-4" /> Food Log</div>

              <div className="flex gap-2">
                <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter") searchFood(); }} placeholder="Search USDA food..." className="flex-1 rounded-2xl bg-[#F7F7F8] px-4 py-3 outline-none" />
                <button onClick={searchFood} className="rounded-2xl bg-black px-5 text-white"><Search className="h-4 w-4" /></button>
              </div>

              <div className="mt-4 space-y-2">
                {results.map((food:any) => (
                  <div key={food.fdcId || food.food_name} className="rounded-2xl bg-[#F7F7F8] p-3">
                    <div className="font-medium">{food.food_name}</div>
                    <div className="text-xs text-[#6B7280]">{food.calories} cal · {food.protein}p · {food.carbs}c · {food.fat}f</div>
                    <div className="mt-2 flex gap-2">
                      <button onClick={()=>addFood(food)} className="rounded-full bg-black px-3 py-1 text-xs text-white">Add</button>
                      <button onClick={()=>favoriteFood(food)} className="rounded-full border px-3 py-1 text-xs">Favorite</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <input value={manual.food_name} onChange={e=>setManual({...manual, food_name:e.target.value})} placeholder="Food" className="rounded-2xl bg-[#F7F7F8] px-4 py-3 outline-none" />
                <input value={manual.calories} onChange={e=>setManual({...manual, calories:e.target.value})} placeholder="Calories" className="rounded-2xl bg-[#F7F7F8] px-4 py-3 outline-none" />
                <input value={manual.protein} onChange={e=>setManual({...manual, protein:e.target.value})} placeholder="Protein" className="rounded-2xl bg-[#F7F7F8] px-4 py-3 outline-none" />
                <input value={manual.carbs} onChange={e=>setManual({...manual, carbs:e.target.value})} placeholder="Carbs" className="rounded-2xl bg-[#F7F7F8] px-4 py-3 outline-none" />
                <input value={manual.fat} onChange={e=>setManual({...manual, fat:e.target.value})} placeholder="Fat" className="rounded-2xl bg-[#F7F7F8] px-4 py-3 outline-none" />
                <input value={manual.serving_qty} onChange={e=>setManual({...manual, serving_qty:e.target.value})} placeholder="Serving" className="rounded-2xl bg-[#F7F7F8] px-4 py-3 outline-none" />
              </div>
              <button onClick={()=>addFood(manual)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-black py-3 text-white"><Plus className="h-4 w-4" /> Add food</button>
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6">
              <h2 className="text-2xl font-medium">Today</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-4">
                {[
                  ["Calories", totals.calories, goals.calories],
                  ["Protein", totals.protein, goals.protein],
                  ["Carbs", totals.carbs, goals.carbs],
                  ["Fat", totals.fat, goals.fat],
                ].map(([name, value, goal]:any) => (
                  <div key={name} className="rounded-2xl bg-[#F7F7F8] p-4">
                    <div className="text-sm text-[#6B7280]">{name}</div>
                    <div className="mt-1 text-2xl font-medium">{Math.round(value)} / {goal}</div>
                    <div className="mt-3 h-2 rounded-full bg-white">
                      <div className="h-2 rounded-full bg-black" style={{ width:`${pct(Number(value), Number(goal))}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6">
              <h2 className="text-2xl font-medium">Daily Log</h2>
              <div className="mt-4 space-y-3">
                {foods.length === 0 && <div className="rounded-2xl bg-[#F7F7F8] p-5 text-[#6B7280]">No food logged today.</div>}
                {foods.map((food:any) => (
                  <div key={food.id} className="flex items-center justify-between gap-3 rounded-2xl bg-[#F7F7F8] p-4">
                    <div>
                      <div className="font-medium">{food.food_name}</div>
                      <div className="text-sm text-[#6B7280]">{Math.round(food.calories * food.serving_qty)} cal · {food.protein}p · {food.carbs}c · {food.fat}f · serving {food.serving_qty}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={()=>setEditing(food)} className="rounded-full border bg-white p-2"><Edit3 className="h-4 w-4" /></button>
                      <button onClick={()=>deleteFood(food.id)} className="rounded-full border bg-white p-2"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {editing && (
              <div className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6">
                <h2 className="text-2xl font-medium">Edit Food</h2>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {["food_name","calories","protein","carbs","fat","serving_qty"].map(k => (
                    <input key={k} value={editing[k] || ""} onChange={e=>setEditing({...editing, [k]:e.target.value})} placeholder={k} className="rounded-2xl bg-[#F7F7F8] px-4 py-3 outline-none" />
                  ))}
                </div>
                <button onClick={updateFood} className="mt-3 rounded-2xl bg-black px-5 py-3 text-white">Save edit</button>
              </div>
            )}

            <div className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6">
              <h2 className="flex items-center gap-2 text-2xl font-medium"><Heart className="h-5 w-5" /> Favorites</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {favorites.map((food:any) => (
                  <div key={food.id} className="rounded-2xl bg-[#F7F7F8] p-4">
                    <div className="font-medium">{food.food_name}</div>
                    <div className="text-xs text-[#6B7280]">{food.calories} cal · {food.protein}p · {food.carbs}c · {food.fat}f</div>
                    <div className="mt-2 flex gap-2">
                      <button onClick={()=>addFood(food)} className="rounded-full bg-black px-3 py-1 text-xs text-white">Add</button>
                      <button onClick={()=>removeFavorite(food.id)} className="rounded-full border px-3 py-1 text-xs">Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6">
              <h2 className="flex items-center gap-2 text-2xl font-medium"><Calendar className="h-5 w-5" /> Meal Planner + AI Coach</h2>
              <button onClick={generatePlan} className="mt-4 flex items-center gap-2 rounded-2xl bg-black px-5 py-3 text-white"><Sparkles className="h-4 w-4" /> {loading ? "Generating..." : "Generate plan"}</button>
              <pre className="mt-5 whitespace-pre-wrap rounded-2xl bg-[#F7F7F8] p-5 text-sm leading-7">{plan || "Generate a plan based on your goals."}</pre>
            </div>

            <div className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6">
              <h2 className="flex items-center gap-2 text-2xl font-medium"><ShoppingCart className="h-5 w-5" /> Grocery List</h2>
              <div className="mt-4 rounded-2xl bg-[#F7F7F8] p-5 text-sm leading-7">
                Eggs, Greek yogurt, chicken breast, lean beef, rice, potatoes, vegetables, fruit, protein powder.
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
