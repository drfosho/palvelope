-- Conversations (one per pair of users)
-- Run after 001_profiles.sql

create table public.conversations (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_message_at timestamptz default now(),
  last_message_preview text,
  participant_1 uuid references auth.users(id) on delete cascade not null,
  participant_2 uuid references auth.users(id) on delete cascade not null,
  -- ensure no duplicate pairs
  unique(participant_1, participant_2)
);

alter table public.conversations enable row level security;

create policy "Users can view their own conversations"
  on public.conversations for select
  using (auth.uid() = participant_1 or auth.uid() = participant_2);

create policy "Users can create conversations"
  on public.conversations for insert
  with check (auth.uid() = participant_1 or auth.uid() = participant_2);

create policy "Participants can update conversation metadata"
  on public.conversations for update
  using (auth.uid() = participant_1 or auth.uid() = participant_2);

-- Auto-update updated_at
create or replace function update_conversation_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger conversations_updated_at
  before update on public.conversations
  for each row execute function update_conversation_timestamp();
