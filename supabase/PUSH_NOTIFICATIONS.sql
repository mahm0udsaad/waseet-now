-- Push notifications infrastructure for Expo Push
-- Run this after schema.sql

-- Table to store user push tokens
create table if not exists public.user_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  expo_push_token text not null,
  platform text check (platform in ('ios', 'android', 'web')),
  device_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint user_push_tokens_unique unique (user_id, expo_push_token)
);

create index if not exists user_push_tokens_user_id_idx on public.user_push_tokens (user_id);
create index if not exists user_push_tokens_token_idx on public.user_push_tokens (expo_push_token);

-- Auto-update updated_at
create or replace function public.set_push_token_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists user_push_tokens_set_updated_at on public.user_push_tokens;
create trigger user_push_tokens_set_updated_at
before update on public.user_push_tokens
for each row
execute procedure public.set_push_token_updated_at();

-- Enable RLS
alter table public.user_push_tokens enable row level security;

-- RLS policies: users can manage their own tokens
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'user_push_tokens' and policyname = 'Users manage own tokens') then
    create policy "Users manage own tokens" on public.user_push_tokens
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end$$;

-- Enable pg_net extension for HTTP requests from database triggers
create extension if not exists pg_net;

-- Function to send push notification via Edge Function.
-- Called by a trigger on the notifications table.
--
-- Reads the service_role_key from Supabase Vault (secret name: 'service_role_key').
-- The project URL is hardcoded because it is not sensitive and never changes.
--
-- Prerequisite: create the vault secret once, e.g. via the Supabase dashboard
-- or SQL editor (run as an authorized role):
--   select vault.create_secret(
--     '<YOUR_SERVICE_ROLE_JWT>',
--     'service_role_key',
--     'Service role key for edge function calls from DB triggers'
--   );
create or replace function public.trigger_push_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  edge_function_url constant text := 'https://nkgkdopsljckzmclgdbm.supabase.co/functions/v1/send-message-push';
  service_role_key text;
begin
  select decrypted_secret
    into service_role_key
  from vault.decrypted_secrets
  where name = 'service_role_key'
  limit 1;

  if service_role_key is null or service_role_key = '' then
    raise warning 'Vault secret `service_role_key` missing or empty. Push notification skipped for notification %.', new.id;
    return new;
  end if;

  -- Async fire-and-forget via pg_net. We don't wait for the response;
  -- push delivery failure must never block the notification insert.
  perform net.http_post(
    url     := edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body    := jsonb_build_object(
      'notification_id', new.id,
      'recipient_id',    new.recipient_id,
      'type',            new.type,
      'conversation_id', new.conversation_id,
      'message_id',      new.message_id,
      'order_id',        new.order_id,
      'damin_order_id',  new.damin_order_id,
      'title',           new.title,
      'body',            new.body
    )
  );

  return new;
exception
  when others then
    raise warning 'Failed to trigger push notification for %: %', new.id, sqlerrm;
    return new;
end;
$$;

-- Create trigger on notifications table
drop trigger if exists notifications_trigger_push on public.notifications;
create trigger notifications_trigger_push
after insert on public.notifications
for each row
execute procedure public.trigger_push_notification();

-- Grant necessary permissions
grant usage on schema net to postgres, anon, authenticated, service_role;
grant all on all tables in schema net to postgres, anon, authenticated, service_role;
grant all on all sequences in schema net to postgres, anon, authenticated, service_role;
grant all on all functions in schema net to postgres, anon, authenticated, service_role;

-- Instructions for setup:
-- 1. Store the service role key in Supabase Vault (once per project). From the
--    Supabase SQL editor, run:
--      select vault.create_secret(
--        '<YOUR_SERVICE_ROLE_JWT>',
--        'service_role_key',
--        'Service role key for edge function calls from DB triggers'
--      );
--
-- 2. Deploy the Edge Function (see supabase/functions/send-message-push/).
--
-- 3. Test by inserting a test notification, then check
--      select * from net._http_response order by created desc limit 5;
--    to confirm the trigger fired and received a 200 from the edge function.

