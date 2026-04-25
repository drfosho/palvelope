-- Reports + blocks
-- Run after 007_letter_expiry.sql

create table if not exists public.reports (
  id uuid default gen_random_uuid() primary key,
  reporter_id uuid references auth.users(id) on delete cascade not null,
  reported_id uuid references auth.users(id) on delete cascade not null,
  conversation_id uuid references public.conversations(id),
  reason text not null,
  created_at timestamptz default now()
);
alter table public.reports enable row level security;
create policy "Users can insert reports"
  on public.reports for insert
  with check (auth.uid() = reporter_id);

create table if not exists public.blocks (
  id uuid default gen_random_uuid() primary key,
  blocker_id uuid references auth.users(id) on delete cascade not null,
  blocked_id uuid references auth.users(id) on delete cascade not null,
  block_type text default 'full',
  created_at timestamptz default now(),
  unique(blocker_id, blocked_id)
);
alter table public.blocks enable row level security;
create policy "Users can manage their own blocks"
  on public.blocks for all
  using (auth.uid() = blocker_id)
  with check (auth.uid() = blocker_id);
