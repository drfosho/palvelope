-- Letter expiration fields + auto-archive helper
-- Run after 006_notification_preferences.sql

-- Add expiry fields to conversations
alter table public.conversations
  add column if not exists expires_at timestamptz,
  add column if not exists expiry_days integer default 14,
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references auth.users(id);

-- Add archived status to conversations
-- status: 'active' | 'archived' | 'expired'
alter table public.conversations
  add column if not exists status text default 'active';

-- Function to auto-archive expired conversations
create or replace function archive_expired_conversations()
returns void as $$
begin
  update public.conversations
  set
    status = 'expired',
    archived_at = now()
  where
    expires_at is not null
    and expires_at < now()
    and status = 'active';
end;
$$ language plpgsql security definer;
