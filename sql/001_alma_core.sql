create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  language text default 'es',
  plan text default 'personal',
  created_at timestamptz default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text default 'Nueva conversación',
  created_at timestamptz default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text check (role in ('user','assistant','system')),
  content text not null,
  created_at timestamptz default now()
);

create table if not exists public.memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  memory_key text not null,
  memory_value text not null,
  created_at timestamptz default now()
);

create table if not exists public.user_modules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  module_key text not null,
  installed boolean default true,
  created_at timestamptz default now(),
  unique(user_id, module_key)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  completed boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  content text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.memory enable row level security;
alter table public.user_modules enable row level security;
alter table public.tasks enable row level security;
alter table public.notes enable row level security;

create policy "profiles own data" on public.profiles
for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "conversations own data" on public.conversations
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "messages own data" on public.messages
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "memory own data" on public.memory
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "modules own data" on public.user_modules
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "tasks own data" on public.tasks
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "notes own data" on public.notes
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
