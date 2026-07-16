"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Apple,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Droplets,
  Dumbbell,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Star,
  Target,
  Trash2,
  X,
} from "lucide-react";
import AlmaShell from "@/components/alma-shell/AlmaShell";
import type { AlmaShellLanguage } from "@/components/alma-shell/types";

type TabKey = "today" | "meals" | "add" | "goals" | "progress";
type MealKey = "breakfast" | "lunch" | "dinner" | "snack";
type SaveStatus = "idle" | "saving" | "success" | "error";
type SearchStatus =
  "idle" | "loading" | "ready" | "empty" | "unavailable" | "error";

type Totals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

type Goals = {
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  water: string;
  target_weight: string;
};

type FoodEntry = {
  id: string;
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving_qty: number;
  meal_type: string;
  log_date?: string;
  created_at?: string;
};

type FoodResult = {
  fdcId?: number;
  food_name: string;
  brand?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  source?: string;
};

type FavoriteFood = {
  id: string;
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  created_at?: string;
};

type Summary = {
  date: string;
  totals: Totals;
  meals?: Record<string, Totals>;
};

type FoodForm = {
  food_name: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  serving_qty: string;
  meal_type: MealKey;
};

const DEFAULT_GOALS: Goals = {
  calories: "",
  protein: "",
  carbs: "",
  fat: "",
  water: "",
  target_weight: "",
};

const EMPTY_TOTALS: Totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

const MEALS: MealKey[] = ["breakfast", "lunch", "dinner", "snack"];

const MEAL_ICONS: Record<MealKey, string> = {
  breakfast: "AM",
  lunch: "NO",
  dinner: "PM",
  snack: "SN",
};

const COPY = {
  en: {
    title: "Fitness",
    subtitle: "Nutrition tracking, goals, and daily food decisions.",
    beta: "Nutrition",
    tabs: {
      today: "Today",
      meals: "Meals",
      add: "Add Food",
      goals: "Goals",
      progress: "Progress",
    },
    meals: {
      breakfast: "Breakfast",
      lunch: "Lunch",
      dinner: "Dinner",
      snack: "Snacks",
    },
    loading: "Loading nutrition workspace...",
    loadError: "Could not load your fitness data.",
    retry: "Retry",
    today: "Today",
    calories: "Calories",
    remaining: "Remaining",
    consumed: "Consumed",
    target: "Target",
    protein: "Protein",
    carbs: "Carbs",
    fat: "Fat",
    waterTarget: "Water target",
    waterNote: "Current water intake is not persisted yet.",
    targetWeight: "Target weight",
    notSet: "Not set",
    mealSummary: "Meal summary",
    noFoodToday: "No foods logged today.",
    addFirstFood: "Add first food",
    addToMeal: "Add",
    edit: "Edit",
    delete: "Delete",
    save: "Save",
    cancel: "Cancel",
    searchTitle: "USDA food search",
    searchPlaceholder: "Search foods, brands, or ingredients",
    searchHint:
      "Search runs through ALMA's server. USDA keys stay server-only.",
    searchEmpty: "No matching foods found.",
    searchUnavailable:
      "USDA search is not configured right now. Manual entry is available.",
    searchError:
      "Food search is temporarily unavailable. Your query is preserved.",
    searching: "Searching foods...",
    selectFood: "Select food",
    selectedFood: "Selected food",
    servingAmount: "Serving amount",
    servingUnit: "serving",
    preview: "Nutrition preview",
    saveFood: "Log food",
    saveFavorite: "Save favorite",
    favorites: "Favorites",
    noFavorites: "No saved favorites yet.",
    recent: "Recent foods",
    noRecent: "Recent foods appear after you log meals.",
    manual: "Manual entry",
    foodName: "Food name",
    meal: "Meal",
    amount: "Amount",
    goalsTitle: "Nutrition goals",
    goalsIntro: "Set targets. ALMA will not change health data automatically.",
    saveGoals: "Save goals",
    goalsSaved: "Goals saved.",
    goalsFailed: "Could not save goals.",
    foodSaved: "Food logged.",
    foodFailed: "Could not save food.",
    editFood: "Edit food",
    deleteFailed: "Could not delete food.",
    favoriteSaved: "Favorite saved.",
    favoriteFailed: "Could not save favorite.",
    validationName: "Enter a food name.",
    validationNumbers: "Use zero or positive numbers.",
    progressTitle: "Progress",
    progressEmpty:
      "Weight history is not persisted in Fitness v2 yet. Target weight is shown when saved.",
    realDataOnly: "Real data only",
    realDataCopy:
      "Totals come from owned food entries. No wearable data or fake charts are shown.",
    offline:
      "You appear to be offline. Saved changes may fail until connected.",
    provider: "USDA FDC",
    perServing: "per serving",
  },
  es: {
    title: "Fitness",
    subtitle: "Registro de nutricion, metas y decisiones diarias.",
    beta: "Nutricion",
    tabs: {
      today: "Hoy",
      meals: "Comidas",
      add: "Agregar",
      goals: "Metas",
      progress: "Progreso",
    },
    meals: {
      breakfast: "Desayuno",
      lunch: "Comida",
      dinner: "Cena",
      snack: "Snacks",
    },
    loading: "Cargando nutricion...",
    loadError: "No se pudo cargar Fitness.",
    retry: "Reintentar",
    today: "Hoy",
    calories: "Calorias",
    remaining: "Restantes",
    consumed: "Consumidas",
    target: "Meta",
    protein: "Proteina",
    carbs: "Carbos",
    fat: "Grasa",
    waterTarget: "Meta de agua",
    waterNote: "El consumo actual de agua aun no se guarda.",
    targetWeight: "Peso meta",
    notSet: "Sin definir",
    mealSummary: "Resumen por comida",
    noFoodToday: "No hay alimentos registrados hoy.",
    addFirstFood: "Agregar alimento",
    addToMeal: "Agregar",
    edit: "Editar",
    delete: "Eliminar",
    save: "Guardar",
    cancel: "Cancelar",
    searchTitle: "Busqueda USDA",
    searchPlaceholder: "Busca alimentos, marcas o ingredientes",
    searchHint:
      "La busqueda pasa por el servidor de ALMA. La clave USDA no va al navegador.",
    searchEmpty: "No se encontraron alimentos.",
    searchUnavailable:
      "USDA no esta configurado ahora. Puedes registrar manualmente.",
    searchError:
      "La busqueda no esta disponible por el momento. Conservamos tu texto.",
    searching: "Buscando alimentos...",
    selectFood: "Seleccionar",
    selectedFood: "Alimento seleccionado",
    servingAmount: "Cantidad",
    servingUnit: "porcion",
    preview: "Vista de nutricion",
    saveFood: "Registrar",
    saveFavorite: "Guardar favorito",
    favorites: "Favoritos",
    noFavorites: "Aun no hay favoritos guardados.",
    recent: "Recientes",
    noRecent: "Los recientes aparecen despues de registrar comidas.",
    manual: "Entrada manual",
    foodName: "Nombre",
    meal: "Comida",
    amount: "Cantidad",
    goalsTitle: "Metas de nutricion",
    goalsIntro: "Define metas. ALMA no cambia datos de salud automaticamente.",
    saveGoals: "Guardar metas",
    goalsSaved: "Metas guardadas.",
    goalsFailed: "No se pudieron guardar las metas.",
    foodSaved: "Alimento registrado.",
    foodFailed: "No se pudo guardar el alimento.",
    editFood: "Editar alimento",
    deleteFailed: "No se pudo eliminar.",
    favoriteSaved: "Favorito guardado.",
    favoriteFailed: "No se pudo guardar favorito.",
    validationName: "Escribe el nombre del alimento.",
    validationNumbers: "Usa numeros positivos o cero.",
    progressTitle: "Progreso",
    progressEmpty:
      "El historial de peso aun no se guarda en Fitness v2. Se muestra el peso meta si existe.",
    realDataOnly: "Solo datos reales",
    realDataCopy:
      "Los totales vienen de alimentos propios. No se muestran wearables ni graficas falsas.",
    offline: "Parece que no tienes conexion. Guardar puede fallar.",
    provider: "USDA FDC",
    perServing: "por porcion",
  },
};

function readStoredLanguage(): AlmaShellLanguage {
  if (typeof window === "undefined") return "en";
  const saved = window.localStorage.getItem("alma_language");
  return saved === "en" || saved === "es" ? saved : "en";
}

function numberValue(value: string | number | null | undefined) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value < 10 ? 1 : 0,
  }).format(round(value));
}

function totalForEntry(entry: FoodEntry): Totals {
  const qty = numberValue(entry.serving_qty || 1);
  return {
    calories: numberValue(entry.calories) * qty,
    protein: numberValue(entry.protein) * qty,
    carbs: numberValue(entry.carbs) * qty,
    fat: numberValue(entry.fat) * qty,
  };
}

function percent(value: number, target: number) {
  if (!target) return 0;
  return Math.min(100, Math.max(0, Math.round((value / target) * 100)));
}

function emptyFoodForm(meal: MealKey): FoodForm {
  return {
    food_name: "",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    serving_qty: "1",
    meal_type: meal,
  };
}

function normalizeMeal(meal: string | null | undefined): MealKey {
  const value = String(meal || "snack").toLowerCase();
  if (value === "breakfast" || value === "lunch" || value === "dinner") {
    return value;
  }
  return "snack";
}

export default function FitnessPage() {
  const [language, setLanguage] =
    useState<AlmaShellLanguage>(readStoredLanguage);
  const t = COPY[language];
  const [activeTab, setActiveTab] = useState<TabKey>("today");
  const [goals, setGoals] = useState<Goals>(DEFAULT_GOALS);
  const [goalForm, setGoalForm] = useState<Goals>(DEFAULT_GOALS);
  const [foods, setFoods] = useState<FoodEntry[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [favorites, setFavorites] = useState<FavoriteFood[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedMeal, setSelectedMeal] = useState<MealKey>("breakfast");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FoodResult[]>([]);
  const [searchStatus, setSearchStatus] = useState<SearchStatus>("idle");
  const [selectedFood, setSelectedFood] = useState<FoodResult | null>(null);
  const [servingQty, setServingQty] = useState("1");
  const [manualForm, setManualForm] = useState<FoodForm>(
    emptyFoodForm("breakfast"),
  );
  const [editingFood, setEditingFood] = useState<FoodEntry | null>(null);
  const [editForm, setEditForm] = useState<FoodForm>(
    emptyFoodForm("breakfast"),
  );
  const [formError, setFormError] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [goalStatus, setGoalStatus] = useState<SaveStatus>("idle");
  const [isOffline, setIsOffline] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [goalsRes, foodsRes, favoritesRes, summaryRes] = await Promise.all([
        fetch("/api/fitness/v2/goals"),
        fetch("/api/fitness/v2/food-log"),
        fetch("/api/fitness/v2/favorites"),
        fetch("/api/fitness/v2/summary"),
      ]);

      if (!goalsRes.ok || !foodsRes.ok || !favoritesRes.ok || !summaryRes.ok) {
        throw new Error("load_failed");
      }

      const goalsData = (await goalsRes.json()) as Goals;
      const foodsData = (await foodsRes.json()) as FoodEntry[];
      const favoritesData = (await favoritesRes.json()) as FavoriteFood[];
      const summaryData = (await summaryRes.json()) as Summary;

      const nextGoals = {
        calories: String(goalsData.calories ?? ""),
        protein: String(goalsData.protein ?? ""),
        carbs: String(goalsData.carbs ?? ""),
        fat: String(goalsData.fat ?? ""),
        water: String(goalsData.water ?? ""),
        target_weight: String(goalsData.target_weight ?? ""),
      };

      setGoals(nextGoals);
      setGoalForm(nextGoals);
      setFoods(Array.isArray(foodsData) ? foodsData : []);
      setFavorites(Array.isArray(favoritesData) ? favoritesData : []);
      setSummary(summaryData);
    } catch {
      setLoadError(t.loadError);
    } finally {
      setLoading(false);
    }
  }, [t.loadError]);

  useEffect(() => {
    // Initial API hydration is intentionally client-owned for this interactive workspace.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    function updateOnlineState() {
      setIsOffline(typeof navigator !== "undefined" && !navigator.onLine);
    }

    updateOnlineState();
    window.addEventListener("online", updateOnlineState);
    window.addEventListener("offline", updateOnlineState);
    return () => {
      window.removeEventListener("online", updateOnlineState);
      window.removeEventListener("offline", updateOnlineState);
    };
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      // Reset transient search state when the user clears the query.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchResults([]);
      setSearchStatus("idle");
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSearchStatus("loading");
      try {
        const res = await fetch(
          `/api/fitness/v2/food-search?q=${encodeURIComponent(searchQuery)}`,
          { signal: controller.signal },
        );

        if (res.status === 503) {
          setSearchResults([]);
          setSearchStatus("unavailable");
          return;
        }

        if (!res.ok) {
          setSearchResults([]);
          setSearchStatus("error");
          return;
        }

        const data = await res.json();
        const foodsData = Array.isArray(data)
          ? (data as FoodResult[])
          : Array.isArray(data.foods)
            ? (data.foods as FoodResult[])
            : [];
        setSearchResults(foodsData);
        setSearchStatus(foodsData.length ? "ready" : "empty");
      } catch {
        if (!controller.signal.aborted) {
          setSearchStatus("error");
        }
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [searchQuery]);

  function updateLanguage(next: AlmaShellLanguage) {
    setLanguage(next);
    localStorage.setItem("alma_language", next);
  }

  const totals = summary?.totals || EMPTY_TOTALS;
  const calorieTarget = numberValue(goals.calories);
  const remainingCalories = Math.max(0, calorieTarget - totals.calories);

  const meals = useMemo(() => {
    return MEALS.map((meal) => {
      const entries = foods.filter(
        (food) => normalizeMeal(food.meal_type) === meal,
      );
      const mealTotals = entries.reduce(
        (acc, entry) => {
          const entryTotals = totalForEntry(entry);
          acc.calories += entryTotals.calories;
          acc.protein += entryTotals.protein;
          acc.carbs += entryTotals.carbs;
          acc.fat += entryTotals.fat;
          return acc;
        },
        { ...EMPTY_TOTALS },
      );
      return { meal, entries, totals: mealTotals };
    });
  }, [foods]);

  const recentFoods = useMemo(() => {
    const seen = new Set<string>();
    return foods.filter((food) => {
      const key = food.food_name.trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [foods]);

  const selectedPreview = useMemo(() => {
    if (!selectedFood) return EMPTY_TOTALS;
    const qty = numberValue(servingQty || 1);
    return {
      calories: numberValue(selectedFood.calories) * qty,
      protein: numberValue(selectedFood.protein) * qty,
      carbs: numberValue(selectedFood.carbs) * qty,
      fat: numberValue(selectedFood.fat) * qty,
    };
  }, [selectedFood, servingQty]);

  function updateGoal(key: keyof Goals, value: string) {
    setGoalForm((current) => ({ ...current, [key]: value }));
    setGoalStatus("idle");
  }

  function updateManual(key: keyof FoodForm, value: string) {
    setManualForm((current) => ({ ...current, [key]: value }));
    setFormError("");
  }

  function updateEdit(key: keyof FoodForm, value: string) {
    setEditForm((current) => ({ ...current, [key]: value }));
    setFormError("");
  }

  function validateFood(form: FoodForm) {
    if (!form.food_name.trim()) return t.validationName;
    const values = [
      form.calories,
      form.protein,
      form.carbs,
      form.fat,
      form.serving_qty,
    ];
    if (values.some((value) => numberValue(value) < 0))
      return t.validationNumbers;
    return "";
  }

  async function saveGoals() {
    const values = Object.values(goalForm);
    if (values.some((value) => value !== "" && numberValue(value) < 0)) {
      setGoalStatus("error");
      setNotice(t.validationNumbers);
      return;
    }

    setGoalStatus("saving");
    setNotice("");
    try {
      const res = await fetch("/api/fitness/v2/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(goalForm),
      });
      if (!res.ok) throw new Error("goals_failed");
      setGoals(goalForm);
      setGoalStatus("success");
      setNotice(t.goalsSaved);
      await loadAll();
    } catch {
      setGoalStatus("error");
      setNotice(t.goalsFailed);
    }
  }

  async function saveFood(payload: FoodForm, options?: { id?: string }) {
    const error = validateFood(payload);
    if (error) {
      setFormError(error);
      return false;
    }

    setSaveStatus("saving");
    setFormError("");
    setNotice("");
    try {
      const res = await fetch("/api/fitness/v2/food-log", {
        method: options?.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: options?.id,
          food_name: payload.food_name.trim(),
          calories: numberValue(payload.calories),
          protein: numberValue(payload.protein),
          carbs: numberValue(payload.carbs),
          fat: numberValue(payload.fat),
          serving_qty: numberValue(payload.serving_qty || 1),
          meal_type: payload.meal_type,
        }),
      });
      if (!res.ok) throw new Error("food_failed");
      setSaveStatus("success");
      setNotice(t.foodSaved);
      await loadAll();
      return true;
    } catch {
      setSaveStatus("error");
      setFormError(t.foodFailed);
      return false;
    }
  }

  async function logSelectedFood() {
    if (!selectedFood || saveStatus === "saving") return;
    const ok = await saveFood({
      food_name: selectedFood.food_name,
      calories: String(selectedFood.calories || 0),
      protein: String(selectedFood.protein || 0),
      carbs: String(selectedFood.carbs || 0),
      fat: String(selectedFood.fat || 0),
      serving_qty: servingQty || "1",
      meal_type: selectedMeal,
    });
    if (ok) {
      setSelectedFood(null);
      setServingQty("1");
      setActiveTab("meals");
    }
  }

  async function logManualFood() {
    if (saveStatus === "saving") return;
    const ok = await saveFood(manualForm);
    if (ok) {
      setManualForm(emptyFoodForm(selectedMeal));
      setActiveTab("meals");
    }
  }

  async function saveEditFood() {
    if (!editingFood || saveStatus === "saving") return;
    const ok = await saveFood(editForm, { id: editingFood.id });
    if (ok) {
      setEditingFood(null);
    }
  }

  async function deleteFood(id: string) {
    setNotice("");
    try {
      const res = await fetch("/api/fitness/v2/food-log", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("delete_failed");
      await loadAll();
    } catch {
      setNotice(t.deleteFailed);
    }
  }

  async function saveFavorite(food: FoodResult | FoodEntry) {
    setNotice("");
    try {
      const res = await fetch("/api/fitness/v2/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          food_name: food.food_name,
          calories: numberValue(food.calories),
          protein: numberValue(food.protein),
          carbs: numberValue(food.carbs),
          fat: numberValue(food.fat),
        }),
      });
      if (!res.ok) throw new Error("favorite_failed");
      setNotice(t.favoriteSaved);
      await loadAll();
    } catch {
      setNotice(t.favoriteFailed);
    }
  }

  function startAdd(meal: MealKey, food?: FoodEntry | FavoriteFood) {
    setSelectedMeal(meal);
    setManualForm(
      food
        ? {
            food_name: food.food_name,
            calories: String(food.calories || 0),
            protein: String(food.protein || 0),
            carbs: String(food.carbs || 0),
            fat: String(food.fat || 0),
            serving_qty: "1",
            meal_type: meal,
          }
        : emptyFoodForm(meal),
    );
    setSelectedFood(null);
    setServingQty("1");
    setFormError("");
    setActiveTab("add");
  }

  function startEdit(food: FoodEntry) {
    setEditingFood(food);
    setEditForm({
      food_name: food.food_name,
      calories: String(food.calories || 0),
      protein: String(food.protein || 0),
      carbs: String(food.carbs || 0),
      fat: String(food.fat || 0),
      serving_qty: String(food.serving_qty || 1),
      meal_type: normalizeMeal(food.meal_type),
    });
    setFormError("");
  }

  function metricCard(
    label: string,
    value: number,
    goal: number,
    unit: string,
  ) {
    return (
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-[#6B7280]">{label}</span>
          <span className="text-xs text-[#6B7280]">{unit}</span>
        </div>
        <div className="mt-2 text-2xl font-medium tracking-tight">
          {formatNumber(value)}
          <span className="text-sm text-[#6B7280]">
            {" "}
            / {formatNumber(goal)}
          </span>
        </div>
        <div className="mt-3 h-2 rounded-full bg-[#F1F2F4]">
          <div
            className="h-2 rounded-full bg-black"
            style={{ width: `${percent(value, goal)}%` }}
          />
        </div>
      </div>
    );
  }

  function renderFoodRow(food: FoodEntry) {
    const entryTotals = totalForEntry(food);
    return (
      <div
        key={food.id}
        className="flex min-w-0 items-center justify-between gap-3 rounded-2xl bg-[#F7F7F8] p-3"
      >
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{food.food_name}</div>
          <div className="mt-1 text-xs text-[#6B7280]">
            {formatNumber(entryTotals.calories)} cal -{" "}
            {formatNumber(entryTotals.protein)}p -{" "}
            {formatNumber(entryTotals.carbs)}c - {formatNumber(entryTotals.fat)}
            f - {food.serving_qty || 1}x
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => startEdit(food)}
            aria-label={t.edit}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E5E7EB] bg-white"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => deleteFood(food.id)}
            aria-label={t.delete}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E5E7EB] bg-white"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  const tabs: { key: TabKey; label: string; icon: typeof Activity }[] = [
    { key: "today", label: t.tabs.today, icon: Activity },
    { key: "meals", label: t.tabs.meals, icon: Apple },
    { key: "add", label: t.tabs.add, icon: Plus },
    { key: "goals", label: t.tabs.goals, icon: Target },
    { key: "progress", label: t.tabs.progress, icon: BarChart3 },
  ];

  return (
    <AlmaShell
      language={language}
      activeWorkspace="fitness"
      title={t.title}
      onLanguageChange={updateLanguage}
    >
      <div className="min-w-0 bg-[#F7F7F8] px-3 py-4 text-black sm:px-4 md:px-6">
        <div className="mx-auto w-full min-w-0 max-w-7xl overflow-hidden">
          <header className="mb-4 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-medium tracking-tight md:text-4xl">
                {t.title}
              </h1>
              <span className="rounded-full border border-[#E5E7EB] bg-white px-3 py-1 text-xs font-medium">
                {t.beta}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-[#6B7280] md:text-base">
              {t.subtitle}
            </p>
          </header>

          {isOffline && (
            <div className="mb-3 flex items-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white p-3 text-sm text-[#6B7280]">
              <CircleAlert className="h-4 w-4 text-black" />
              {t.offline}
            </div>
          )}

          <div className="mb-4 w-full min-w-0 max-w-full overflow-x-auto pb-1">
            <div className="inline-flex w-max max-w-none gap-2">
              {tabs.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm font-medium ${
                    activeTab === key
                      ? "border-black bg-black text-white"
                      : "border-[#E5E7EB] bg-white text-[#6B7280]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {notice && (
            <div className="mb-4 flex items-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white p-3 text-sm text-[#6B7280]">
              <CheckCircle2 className="h-4 w-4 text-black" />
              {notice}
            </div>
          )}

          {loading ? (
            <div className="flex min-h-64 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white text-sm text-[#6B7280]">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t.loading}
            </div>
          ) : loadError ? (
            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
              <div className="flex items-start gap-3">
                <CircleAlert className="mt-0.5 h-5 w-5" />
                <div>
                  <h2 className="font-medium">{loadError}</h2>
                  <button
                    type="button"
                    onClick={loadAll}
                    className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-black px-4 text-sm font-medium text-white"
                  >
                    <RefreshCw className="h-4 w-4" />
                    {t.retry}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
              <section className="min-w-0">
                {activeTab === "today" && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-[#6B7280]">
                            {t.today}
                          </p>
                          <h2 className="mt-1 text-3xl font-medium tracking-tight">
                            {formatNumber(totals.calories)} {t.consumed}
                          </h2>
                        </div>
                        <div className="rounded-2xl bg-[#F7F7F8] px-4 py-3 text-right">
                          <div className="text-xs text-[#6B7280]">
                            {t.remaining}
                          </div>
                          <div className="text-xl font-medium">
                            {formatNumber(remainingCalories)}
                          </div>
                        </div>
                      </div>
                      <div className="mt-5 h-3 rounded-full bg-[#F1F2F4]">
                        <div
                          className="h-3 rounded-full bg-black"
                          style={{
                            width: `${percent(totals.calories, calorieTarget)}%`,
                          }}
                        />
                      </div>
                      <div className="mt-3 flex justify-between text-xs text-[#6B7280]">
                        <span>{t.calories}</span>
                        <span>
                          {formatNumber(totals.calories)} /{" "}
                          {formatNumber(calorieTarget)}
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      {metricCard(
                        t.protein,
                        totals.protein,
                        numberValue(goals.protein),
                        "g",
                      )}
                      {metricCard(
                        t.carbs,
                        totals.carbs,
                        numberValue(goals.carbs),
                        "g",
                      )}
                      {metricCard(
                        t.fat,
                        totals.fat,
                        numberValue(goals.fat),
                        "g",
                      )}
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Droplets className="h-4 w-4" />
                          {t.waterTarget}
                        </div>
                        <div className="mt-2 text-2xl font-medium">
                          {goals.water ? `${goals.water} oz` : t.notSet}
                        </div>
                        <p className="mt-2 text-sm text-[#6B7280]">
                          {t.waterNote}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Target className="h-4 w-4" />
                          {t.targetWeight}
                        </div>
                        <div className="mt-2 text-2xl font-medium">
                          {goals.target_weight
                            ? `${goals.target_weight} lb`
                            : t.notSet}
                        </div>
                        <p className="mt-2 text-sm text-[#6B7280]">
                          {t.realDataOnly}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h2 className="font-medium">{t.mealSummary}</h2>
                        <button
                          type="button"
                          onClick={() => setActiveTab("meals")}
                          className="text-sm text-[#6B7280]"
                        >
                          {t.tabs.meals}
                        </button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {meals.map(({ meal, totals: mealTotals }) => (
                          <button
                            key={meal}
                            type="button"
                            onClick={() => startAdd(meal)}
                            className="flex min-h-16 items-center justify-between rounded-2xl bg-[#F7F7F8] p-3 text-left"
                          >
                            <div>
                              <div className="font-medium">{t.meals[meal]}</div>
                              <div className="text-xs text-[#6B7280]">
                                {formatNumber(mealTotals.calories)} cal
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-[#6B7280]" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "meals" && (
                  <div className="space-y-4">
                    {meals.map(({ meal, entries, totals: mealTotals }) => (
                      <section
                        key={meal}
                        className="rounded-2xl border border-[#E5E7EB] bg-white p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F7F7F8] text-xs font-medium">
                              {MEAL_ICONS[meal]}
                            </div>
                            <div className="min-w-0">
                              <h2 className="font-medium">{t.meals[meal]}</h2>
                              <p className="text-sm text-[#6B7280]">
                                {formatNumber(mealTotals.calories)} cal -{" "}
                                {formatNumber(mealTotals.protein)}p -{" "}
                                {formatNumber(mealTotals.carbs)}c -{" "}
                                {formatNumber(mealTotals.fat)}f
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => startAdd(meal)}
                            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-black px-4 text-sm font-medium text-white"
                          >
                            <Plus className="h-4 w-4" />
                            {t.addToMeal}
                          </button>
                        </div>
                        <div className="mt-4 space-y-2">
                          {entries.length ? (
                            entries.map(renderFoodRow)
                          ) : (
                            <div className="rounded-2xl bg-[#F7F7F8] p-4 text-sm text-[#6B7280]">
                              {t.noFoodToday}
                            </div>
                          )}
                        </div>
                      </section>
                    ))}
                  </div>
                )}

                {activeTab === "add" && (
                  <div className="space-y-4">
                    <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h2 className="font-medium">{t.searchTitle}</h2>
                          <p className="mt-1 text-sm text-[#6B7280]">
                            {t.searchHint}
                          </p>
                        </div>
                        <select
                          value={selectedMeal}
                          onChange={(event) =>
                            setSelectedMeal(event.target.value as MealKey)
                          }
                          className="min-h-11 rounded-full border border-[#E5E7EB] bg-white px-4 text-sm outline-none"
                        >
                          {MEALS.map((meal) => (
                            <option key={meal} value={meal}>
                              {t.meals[meal]}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="relative">
                        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
                        <input
                          value={searchQuery}
                          onChange={(event) =>
                            setSearchQuery(event.target.value)
                          }
                          placeholder={t.searchPlaceholder}
                          className="min-h-12 w-full rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-11 text-base outline-none"
                        />
                      </div>

                      <div className="mt-4 space-y-2">
                        {searchStatus === "loading" && (
                          <div className="flex items-center gap-2 rounded-2xl bg-[#F7F7F8] p-4 text-sm text-[#6B7280]">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {t.searching}
                          </div>
                        )}
                        {searchStatus === "empty" && (
                          <div className="rounded-2xl bg-[#F7F7F8] p-4 text-sm text-[#6B7280]">
                            {t.searchEmpty}
                          </div>
                        )}
                        {searchStatus === "unavailable" && (
                          <div className="rounded-2xl bg-[#F7F7F8] p-4 text-sm text-[#6B7280]">
                            {t.searchUnavailable}
                          </div>
                        )}
                        {searchStatus === "error" && (
                          <div className="rounded-2xl bg-[#F7F7F8] p-4 text-sm text-[#6B7280]">
                            {t.searchError}
                          </div>
                        )}
                        {searchResults.map((food) => (
                          <button
                            key={`${food.fdcId || food.food_name}-${food.brand || ""}`}
                            type="button"
                            onClick={() => {
                              setSelectedFood(food);
                              setServingQty("1");
                              setFormError("");
                            }}
                            className="flex w-full items-center justify-between gap-3 rounded-2xl bg-[#F7F7F8] p-3 text-left"
                          >
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium">
                                {food.food_name}
                              </div>
                              <div className="mt-1 truncate text-xs text-[#6B7280]">
                                {food.brand || t.provider} -{" "}
                                {formatNumber(numberValue(food.calories))} cal -{" "}
                                {formatNumber(numberValue(food.protein))}p
                              </div>
                            </div>
                            <span className="shrink-0 rounded-full bg-white px-3 py-2 text-xs font-medium">
                              {t.selectFood}
                            </span>
                          </button>
                        ))}
                      </div>
                    </section>

                    {selectedFood && (
                      <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h2 className="font-medium">{t.selectedFood}</h2>
                            <p className="mt-1 truncate text-sm text-[#6B7280]">
                              {selectedFood.food_name}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedFood(null)}
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E5E7EB]"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <label className="mt-4 block text-sm font-medium">
                          {t.servingAmount}
                          <input
                            value={servingQty}
                            onChange={(event) =>
                              setServingQty(event.target.value)
                            }
                            inputMode="decimal"
                            className="mt-2 min-h-12 w-full rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 outline-none"
                          />
                        </label>
                        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {[
                            [t.calories, selectedPreview.calories, "cal"],
                            [t.protein, selectedPreview.protein, "g"],
                            [t.carbs, selectedPreview.carbs, "g"],
                            [t.fat, selectedPreview.fat, "g"],
                          ].map(([label, value, unit]) => (
                            <div
                              key={String(label)}
                              className="rounded-2xl bg-[#F7F7F8] p-3"
                            >
                              <div className="text-xs text-[#6B7280]">
                                {label}
                              </div>
                              <div className="mt-1 font-medium">
                                {formatNumber(Number(value))} {unit}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={saveStatus === "saving"}
                            onClick={logSelectedFood}
                            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-black px-5 text-sm font-medium text-white disabled:bg-[#A3A3A3]"
                          >
                            {saveStatus === "saving" ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Plus className="h-4 w-4" />
                            )}
                            {t.saveFood}
                          </button>
                          <button
                            type="button"
                            onClick={() => saveFavorite(selectedFood)}
                            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#E5E7EB] px-5 text-sm font-medium"
                          >
                            <Star className="h-4 w-4" />
                            {t.saveFavorite}
                          </button>
                        </div>
                      </section>
                    )}

                    <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
                      <h2 className="font-medium">{t.manual}</h2>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <label className="text-sm font-medium sm:col-span-2">
                          {t.foodName}
                          <input
                            value={manualForm.food_name}
                            onChange={(event) =>
                              updateManual("food_name", event.target.value)
                            }
                            className="mt-2 min-h-12 w-full rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 outline-none"
                          />
                        </label>
                        <label className="text-sm font-medium">
                          {t.meal}
                          <select
                            value={manualForm.meal_type}
                            onChange={(event) =>
                              updateManual("meal_type", event.target.value)
                            }
                            className="mt-2 min-h-12 w-full rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 outline-none"
                          >
                            {MEALS.map((meal) => (
                              <option key={meal} value={meal}>
                                {t.meals[meal]}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="text-sm font-medium">
                          {t.amount}
                          <input
                            value={manualForm.serving_qty}
                            onChange={(event) =>
                              updateManual("serving_qty", event.target.value)
                            }
                            inputMode="decimal"
                            className="mt-2 min-h-12 w-full rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 outline-none"
                          />
                        </label>
                        {(["calories", "protein", "carbs", "fat"] as const).map(
                          (key) => (
                            <label key={key} className="text-sm font-medium">
                              {t[key]}
                              <input
                                value={manualForm[key]}
                                onChange={(event) =>
                                  updateManual(key, event.target.value)
                                }
                                inputMode="decimal"
                                className="mt-2 min-h-12 w-full rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 outline-none"
                              />
                            </label>
                          ),
                        )}
                      </div>
                      {formError && (
                        <p className="mt-3 text-sm text-[#6B7280]">
                          {formError}
                        </p>
                      )}
                      <button
                        type="button"
                        disabled={saveStatus === "saving"}
                        onClick={logManualFood}
                        className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-black px-5 text-sm font-medium text-white disabled:bg-[#A3A3A3]"
                      >
                        {saveStatus === "saving" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                        {t.saveFood}
                      </button>
                    </section>
                  </div>
                )}

                {activeTab === "goals" && (
                  <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F7F7F8]">
                        <Target className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="font-medium">{t.goalsTitle}</h2>
                        <p className="mt-1 text-sm text-[#6B7280]">
                          {t.goalsIntro}
                        </p>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      {(["calories", "protein", "carbs", "fat"] as const).map(
                        (key) => (
                          <label key={key} className="text-sm font-medium">
                            {t[key]} {key === "calories" ? "(kcal)" : "(g)"}
                            <input
                              value={goalForm[key]}
                              onChange={(event) =>
                                updateGoal(key, event.target.value)
                              }
                              inputMode="decimal"
                              className="mt-2 min-h-12 w-full rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 outline-none"
                            />
                          </label>
                        ),
                      )}
                      <label className="text-sm font-medium">
                        {t.waterTarget} (oz)
                        <input
                          value={goalForm.water}
                          onChange={(event) =>
                            updateGoal("water", event.target.value)
                          }
                          inputMode="decimal"
                          className="mt-2 min-h-12 w-full rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 outline-none"
                        />
                      </label>
                      <label className="text-sm font-medium">
                        {t.targetWeight} (lb)
                        <input
                          value={goalForm.target_weight}
                          onChange={(event) =>
                            updateGoal("target_weight", event.target.value)
                          }
                          inputMode="decimal"
                          className="mt-2 min-h-12 w-full rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 outline-none"
                        />
                      </label>
                    </div>
                    <button
                      type="button"
                      disabled={goalStatus === "saving"}
                      onClick={saveGoals}
                      className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-black px-5 text-sm font-medium text-white disabled:bg-[#A3A3A3]"
                    >
                      {goalStatus === "saving" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      {t.saveGoals}
                    </button>
                  </section>
                )}

                {activeTab === "progress" && (
                  <div className="space-y-4">
                    <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F7F7F8]">
                          <BarChart3 className="h-5 w-5" />
                        </div>
                        <div>
                          <h2 className="font-medium">{t.progressTitle}</h2>
                          <p className="mt-1 text-sm leading-6 text-[#6B7280]">
                            {t.progressEmpty}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 rounded-2xl bg-[#F7F7F8] p-4">
                        <div className="text-sm text-[#6B7280]">
                          {t.targetWeight}
                        </div>
                        <div className="mt-1 text-2xl font-medium">
                          {goals.target_weight
                            ? `${goals.target_weight} lb`
                            : t.notSet}
                        </div>
                      </div>
                    </section>
                    <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
                      <h2 className="flex items-center gap-2 font-medium">
                        <Dumbbell className="h-4 w-4" />
                        {t.realDataOnly}
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-[#6B7280]">
                        {t.realDataCopy}
                      </p>
                    </section>
                  </div>
                )}
              </section>

              <aside className="hidden min-w-0 space-y-4 xl:block">
                <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
                  <h2 className="font-medium">{t.recent}</h2>
                  <div className="mt-3 space-y-2">
                    {recentFoods.length ? (
                      recentFoods.slice(0, 5).map((food) => (
                        <button
                          key={food.id}
                          type="button"
                          onClick={() =>
                            startAdd(normalizeMeal(food.meal_type), food)
                          }
                          className="flex w-full items-center justify-between gap-3 rounded-2xl bg-[#F7F7F8] p-3 text-left"
                        >
                          <span className="truncate text-sm font-medium">
                            {food.food_name}
                          </span>
                          <Plus className="h-4 w-4 shrink-0" />
                        </button>
                      ))
                    ) : (
                      <div className="rounded-2xl bg-[#F7F7F8] p-4 text-sm text-[#6B7280]">
                        {t.noRecent}
                      </div>
                    )}
                  </div>
                </section>
                <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
                  <h2 className="font-medium">{t.favorites}</h2>
                  <div className="mt-3 space-y-2">
                    {favorites.length ? (
                      favorites.slice(0, 5).map((food) => (
                        <button
                          key={food.id}
                          type="button"
                          onClick={() => startAdd(selectedMeal, food)}
                          className="flex w-full items-center justify-between gap-3 rounded-2xl bg-[#F7F7F8] p-3 text-left"
                        >
                          <span className="truncate text-sm font-medium">
                            {food.food_name}
                          </span>
                          <Star className="h-4 w-4 shrink-0" />
                        </button>
                      ))
                    ) : (
                      <div className="rounded-2xl bg-[#F7F7F8] p-4 text-sm text-[#6B7280]">
                        {t.noFavorites}
                      </div>
                    )}
                  </div>
                </section>
              </aside>
            </div>
          )}
        </div>
      </div>

      {editingFood && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 p-3 sm:items-center sm:justify-center">
          <div className="max-h-[92dvh] w-full overflow-y-auto rounded-2xl bg-white p-4 shadow-xl sm:max-w-lg">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-medium">{t.editFood}</h2>
              <button
                type="button"
                onClick={() => setEditingFood(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E5E7EB]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium sm:col-span-2">
                {t.foodName}
                <input
                  value={editForm.food_name}
                  onChange={(event) =>
                    updateEdit("food_name", event.target.value)
                  }
                  className="mt-2 min-h-12 w-full rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 outline-none"
                />
              </label>
              <label className="text-sm font-medium">
                {t.meal}
                <select
                  value={editForm.meal_type}
                  onChange={(event) =>
                    updateEdit("meal_type", event.target.value)
                  }
                  className="mt-2 min-h-12 w-full rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 outline-none"
                >
                  {MEALS.map((meal) => (
                    <option key={meal} value={meal}>
                      {t.meals[meal]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium">
                {t.amount}
                <input
                  value={editForm.serving_qty}
                  onChange={(event) =>
                    updateEdit("serving_qty", event.target.value)
                  }
                  inputMode="decimal"
                  className="mt-2 min-h-12 w-full rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 outline-none"
                />
              </label>
              {(["calories", "protein", "carbs", "fat"] as const).map((key) => (
                <label key={key} className="text-sm font-medium">
                  {t[key]}
                  <input
                    value={editForm[key]}
                    onChange={(event) => updateEdit(key, event.target.value)}
                    inputMode="decimal"
                    className="mt-2 min-h-12 w-full rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 outline-none"
                  />
                </label>
              ))}
            </div>
            {formError && (
              <p className="mt-3 text-sm text-[#6B7280]">{formError}</p>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saveStatus === "saving"}
                onClick={saveEditFood}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-black px-5 text-sm font-medium text-white disabled:bg-[#A3A3A3]"
              >
                {saveStatus === "saving" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {t.save}
              </button>
              <button
                type="button"
                onClick={() => setEditingFood(null)}
                className="inline-flex min-h-11 items-center rounded-full border border-[#E5E7EB] px-5 text-sm font-medium"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </AlmaShell>
  );
}
