-- Memory moments + conversation modes + periodic prompts + milestones
-- Run after 009_invites.sql

-- ─── Moments ────────────────────────────────────────────────────────────────

create table public.moments (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  saved_by uuid references auth.users(id) on delete cascade not null,
  message_id uuid references public.messages(id) on delete set null,
  content text not null,
  note text, -- optional personal note added when saving
  created_at timestamptz default now()
);
alter table public.moments enable row level security;
create policy "Conversation participants can view moments"
  on public.moments for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = moments.conversation_id
      and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())
    )
  );
create policy "Users can save moments"
  on public.moments for insert
  with check (auth.uid() = saved_by);
create policy "Users can delete their own moments"
  on public.moments for delete
  using (auth.uid() = saved_by);

-- ─── Conversation modes ─────────────────────────────────────────────────────

alter table public.conversations
  add column if not exists mode text default 'thoughtful', -- 'live' | 'thoughtful' | 'letterlike'
  add column if not exists mode_proposed_by uuid references auth.users(id),
  add column if not exists mode_proposed text,
  add column if not exists mode_proposal_created_at timestamptz;

-- ─── Periodic prompt + message count tracking ──────────────────────────────

alter table public.conversations
  add column if not exists last_prompt_sent_at timestamptz,
  add column if not exists message_count integer default 0;

-- Increment message count on insert
create or replace function increment_message_count()
returns trigger as $$
begin
  update public.conversations
  set message_count = message_count + 1
  where id = new.conversation_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists messages_increment_count on public.messages;
create trigger messages_increment_count
  after insert on public.messages
  for each row execute function increment_message_count();

-- ─── Friendship milestones ─────────────────────────────────────────────────

create table public.milestones (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  type text not null, -- 'first_week' | 'ten_messages' | 'first_moment' | 'one_month' | 'hundred_messages'
  achieved_at timestamptz default now(),
  shown boolean default false,
  unique(conversation_id, type)
);
alter table public.milestones enable row level security;
create policy "Participants can view milestones"
  on public.milestones for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = milestones.conversation_id
      and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())
    )
  );
create policy "Participants can insert milestones"
  on public.milestones for insert
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = milestones.conversation_id
      and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())
    )
  );
create policy "Participants can update milestones"
  on public.milestones for update
  using (
    exists (
      select 1 from public.conversations c
      where c.id = milestones.conversation_id
      and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())
    )
  );
