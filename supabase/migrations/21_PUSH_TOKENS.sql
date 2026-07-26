-- Device push-notification tokens registered by the native app shell.
-- Run in the Supabase SQL editor (or via supabase db push).

create table if not exists public.push_tokens (
  token text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null default 'android',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.push_tokens enable row level security;

-- Each signed-in user manages only their own tokens.
create policy "own tokens: insert" on public.push_tokens
  for insert with check (auth.uid() = user_id);
create policy "own tokens: update" on public.push_tokens
  for update using (auth.uid() = user_id);
create policy "own tokens: select" on public.push_tokens
  for select using (auth.uid() = user_id);
create policy "own tokens: delete" on public.push_tokens
  for delete using (auth.uid() = user_id);
