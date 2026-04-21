-- Daily match batches
-- Run after 003_messages.sql

create table public.matches (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  matched_user_id uuid references auth.users(id) on delete cascade not null,
  compatibility_score integer not null default 0,
  batch_date date not null default current_date,
  status text default 'pending', -- pending | accepted | passed
  created_at timestamptz default now(),
  unique(user_id, matched_user_id, batch_date)
);

alter table public.matches enable row level security;

create policy "Users can view their own matches"
  on public.matches for select
  using (auth.uid() = user_id);

create policy "Users can update their own matches"
  on public.matches for update
  using (auth.uid() = user_id);

-- Matching score function: counts overlapping interests
create or replace function calculate_compatibility(user1_id uuid, user2_id uuid)
returns integer as $$
declare
  score integer := 0;
  u1_interests text[];
  u2_interests text[];
  u1_reply text;
  u2_reply text;
  overlap_count integer;
begin
  select interests, reply_style into u1_interests, u1_reply
  from public.profiles where id = user1_id;

  select interests, reply_style into u2_interests, u2_reply
  from public.profiles where id = user2_id;

  -- 10 points per shared interest
  select count(*) into overlap_count
  from (select unnest(u1_interests) intersect select unnest(u2_interests)) as shared;

  score := 10 * coalesce(overlap_count, 0);

  -- 20 point bonus for matching reply style
  if u1_reply = u2_reply then
    score := score + 20;
  end if;

  return score;
end;
$$ language plpgsql;

-- Generate daily batch for a user (call from Edge Function or manually)
create or replace function generate_daily_matches(target_user_id uuid)
returns void as $$
declare
  candidate record;
  score integer;
  match_count integer := 0;
begin
  -- Delete today's existing pending matches for this user
  delete from public.matches
  where user_id = target_user_id
  and batch_date = current_date
  and status = 'pending';

  -- Find up to 10 compatible users
  for candidate in (
    select p.id
    from public.profiles p
    where p.id != target_user_id
    and p.onboarding_complete = true
    and p.id not in (
      -- exclude users already in a conversation with target
      select case when participant_1 = target_user_id then participant_2 else participant_1 end
      from public.conversations
      where participant_1 = target_user_id or participant_2 = target_user_id
    )
    order by random()
    limit 50
  ) loop
    score := calculate_compatibility(target_user_id, candidate.id);
    if score > 0 then
      insert into public.matches (user_id, matched_user_id, compatibility_score, batch_date)
      values (target_user_id, candidate.id, score, current_date)
      on conflict do nothing;
      match_count := match_count + 1;
      exit when match_count >= 10;
    end if;
  end loop;
end;
$$ language plpgsql security definer;
