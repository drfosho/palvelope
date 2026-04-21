-- Messages within conversations
-- Run after 002_conversations.sql

create table public.messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now(),
  read_at timestamptz,
  ai_flagged boolean default false,
  ai_flag_reason text
);

alter table public.messages enable row level security;

create policy "Conversation participants can view messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
      and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())
    )
  );

create policy "Sender can insert messages"
  on public.messages for insert
  with check (auth.uid() = sender_id);

create policy "Participants can mark messages as read"
  on public.messages for update
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
      and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())
    )
  );

-- Enable realtime for messages and conversations
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;

-- After a message is inserted, update the conversation's last_message fields
create or replace function update_conversation_on_message()
returns trigger as $$
begin
  update public.conversations
  set
    last_message_at = new.created_at,
    last_message_preview = left(new.content, 100),
    updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$ language plpgsql;

create trigger messages_update_conversation
  after insert on public.messages
  for each row execute function update_conversation_on_message();
