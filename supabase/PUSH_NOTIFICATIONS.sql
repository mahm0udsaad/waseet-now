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

-- Function to send push notification via Edge Function
-- This will be called by a trigger on notifications table
create or replace function public.trigger_push_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  edge_function_url text;
  service_role_key text;
  supabase_url text;
begin
  -- Only send push for 'message' type notifications
  if new.type != 'message' then
    return new;
  end if;

  -- Get Supabase URL and service role key from environment
  -- These should be set in Supabase Dashboard > Project Settings > Database > Vault
  -- For now, we'll use a placeholder that needs to be configured
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_role_key := current_setting('app.settings.service_role_key', true);
  
  if supabase_url is null or service_role_key is null then
    raise warning 'Supabase URL or service role key not configured. Push notification skipped.';
    return new;
  end if;

  edge_function_url := supabase_url || '/functions/v1/send-message-push';

  -- Make async HTTP request to Edge Function
  perform net.http_post(
    url := edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := jsonb_build_object(
      'notification_id', new.id,
      'recipient_id', new.recipient_id,
      'conversation_id', new.conversation_id,
      'message_id', new.message_id,
      'title', new.title,
      'body', new.body
    )
  );

  return new;
exception
  when others then
    -- Don't fail the notification insert if push fails
    raise warning 'Failed to trigger push notification: %', sqlerrm;
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
-- 1. Set environment variables in Supabase Dashboard:
--    - Go to Project Settings > Database > Configuration
--    - Add these settings:
--      ALTER DATABASE postgres SET app.settings.supabase_url = 'https://your-project.supabase.co';
--      ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key';
--
-- 2. Deploy the Edge Function (see supabase/functions/send-message-push/)
--
-- 3. Test by sending a message in the app

