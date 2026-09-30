-- Run once in Supabase > SQL Editor
create table if not exists public.user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.user_state enable row level security;
create policy "read own"   on public.user_state for select using (auth.uid() = user_id);
create policy "insert own" on public.user_state for insert with check (auth.uid() = user_id);
create policy "update own" on public.user_state for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own" on public.user_state for delete using (auth.uid() = user_id);
-- Dashboard > Authentication > URL Configuration: add your site URL (and http://localhost:3000) to Redirect URLs.
