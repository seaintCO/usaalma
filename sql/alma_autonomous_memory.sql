create table if not exists alma_user_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  memory_key text not null,
  memory_value text not null,
  category text default 'general',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, memory_key)
);

create table if not exists alma_action_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  action_type text not null,
  input text,
  result text,
  status text default 'completed',
  created_at timestamptz default now()
);

alter table alma_user_memory enable row level security;
alter table alma_action_logs enable row level security;

drop policy if exists "Users manage own alma memory" on alma_user_memory;
create policy "Users manage own alma memory"
on alma_user_memory for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own action logs" on alma_action_logs;
create policy "Users manage own action logs"
on alma_action_logs for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
