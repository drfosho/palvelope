-- Push notification tokens
-- Run after 004_matches.sql

create table public.push_tokens (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  token text not null,
  platform text not null, -- 'ios' | 'android'
  created_at timestamptz default now(),
  unique(user_id, token)
);

alter table public.push_tokens enable row level security;

create policy "Users can manage their own push tokens"
  on public.push_tokens for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
