-- Palvelope profiles table
-- Run this in your Supabase project's SQL Editor (Dashboard → SQL Editor → New Query)
-- or via the Supabase CLI: supabase db push
-- Run migrations in order: 001 → 002 → 003 → 004 → 005

create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  display_name text,
  bio text,
  interests text[] default '{}',
  anonymity_level text default 'pen_name',
  reply_style text default 'thoughtful',
  home_region text,
  target_regions text[] default '{}',
  show_location boolean default false,
  onboarding_complete boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Authenticated users can view all profiles"
  on public.profiles for select
  using (auth.role() = 'authenticated');

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);
