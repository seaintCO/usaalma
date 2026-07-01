create table if not exists fitness_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null default 'Fitness Plan',
  goal text,
  calories integer,
  protein integer,
  carbs integer,
  fats integer,
  plan_text text not null,
  created_at timestamptz default now()
);

create table if not exists fitness_food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  food_name text not null,
  calories integer not null default 0,
  protein integer default 0,
  carbs integer default 0,
  fats integer default 0,
  meal_type text default 'Meal',
  log_date date default current_date,
  created_at timestamptz default now()
);

create table if not exists fitness_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  daily_calories integer default 2200,
  daily_protein integer default 180,
  weekly_weight_goal text default 'Maintain',
  water_goal_oz integer default 100,
  workout_days integer default 5,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists planner_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  notes text,
  task_date date default current_date,
  task_time text,
  category text default 'Personal',
  priority text default 'Medium',
  completed boolean default false,
  created_at timestamptz default now()
);

alter table fitness_plans enable row level security;
alter table fitness_food_logs enable row level security;
alter table fitness_goals enable row level security;
alter table planner_tasks enable row level security;

drop policy if exists "Users manage own fitness plans" on fitness_plans;
create policy "Users manage own fitness plans"
on fitness_plans for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own food logs" on fitness_food_logs;
create policy "Users manage own food logs"
on fitness_food_logs for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own fitness goals" on fitness_goals;
create policy "Users manage own fitness goals"
on fitness_goals for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own planner tasks" on planner_tasks;
create policy "Users manage own planner tasks"
on planner_tasks for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
