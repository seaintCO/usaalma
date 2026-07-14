begin;
alter table public.fitness_goals add column if not exists daily_carbs numeric;alter table public.fitness_goals add column if not exists daily_fat numeric;alter table public.fitness_goals add column if not exists target_weight numeric;
create index if not exists fitness_food_entries_user_date_idx on public.fitness_food_entries(user_id,log_date);
commit;
