-- Trusted-circle invites + accepted-invite trusted connections
-- Run after 008_safety.sql

create table if not exists public.invites (
  id uuid default gen_random_uuid() primary key,
  inviter_id uuid references auth.users(id) on delete cascade not null,
  code text unique not null default upper(
    substring(replace(gen_random_uuid()::text, '-', ''), 1, 3)
    || '-' ||
    substring(replace(gen_random_uuid()::text, '-', ''), 1, 3)
  ),
  accepted_by uuid references auth.users(id),
  accepted_at timestamptz,
  expires_at timestamptz default (now() + interval '48 hours'),
  created_at timestamptz default now(),
  status text default 'pending' -- pending | accepted | expired
);
alter table public.invites enable row level security;
create policy "Users can create invites"
  on public.invites for insert
  with check (auth.uid() = inviter_id);
create policy "Users can view their own invites"
  on public.invites for select
  using (auth.uid() = inviter_id);
create policy "Anyone can look up an invite by code"
  on public.invites for select
  using (true);
create policy "Users can update invites they accepted"
  on public.invites for update
  using (auth.uid() = inviter_id or auth.uid() = accepted_by);

-- Trusted connections (accepted invites become trusted connections)
create table if not exists public.trusted_connections (
  id uuid default gen_random_uuid() primary key,
  user_1 uuid references auth.users(id) on delete cascade not null,
  user_2 uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(user_1, user_2)
);
alter table public.trusted_connections enable row level security;
create policy "Users can view their own trusted connections"
  on public.trusted_connections for select
  using (auth.uid() = user_1 or auth.uid() = user_2);
create policy "System can insert trusted connections"
  on public.trusted_connections for insert
  with check (auth.uid() = user_1 or auth.uid() = user_2);
