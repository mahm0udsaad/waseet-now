-- Minimal, idempotent Supabase patch for "live chat" + in-app notifications (no push).
-- Safe to run multiple times.
--
-- Includes:
-- 1) RPC: public.create_dm_conversation(other_user_id uuid)
-- 2) In-app notifications table + RLS policies
-- 3) Trigger to create notifications on message insert
-- 4) PostgREST schema cache reload hint

-- -----------------------------
-- 1) RPC: create/reuse DM conversation
-- -----------------------------
create or replace function public.create_dm_conversation(other_user_id uuid)
returns table (conversation_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if other_user_id is null then
    raise exception 'Missing other_user_id';
  end if;
  if other_user_id = auth.uid() then
    raise exception 'Cannot create DM with yourself';
  end if;

  -- Reuse an existing DM conversation if it already exists.
  select cm1.conversation_id
    into cid
  from public.conversation_members cm1
  join public.conversation_members cm2
    on cm1.conversation_id = cm2.conversation_id
  join public.conversations c
    on c.id = cm1.conversation_id
  where c.type = 'dm'
    and cm1.user_id = auth.uid()
    and cm2.user_id = other_user_id
  limit 1;

  if cid is not null then
    return query select cid;
  end if;

  insert into public.conversations (type)
  values ('dm')
  returning id into cid;

  insert into public.conversation_members (conversation_id, user_id)
  values (cid, auth.uid())
  on conflict do nothing;

  insert into public.conversation_members (conversation_id, user_id)
  values (cid, other_user_id)
  on conflict do nothing;

  return query select cid;
end;
$$;

revoke all on function public.create_dm_conversation(uuid) from public;
grant execute on function public.create_dm_conversation(uuid) to authenticated;

-- -----------------------------
-- 2) In-app notifications (no push)
-- -----------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete cascade,
  message_id uuid references public.messages(id) on delete cascade,
  type text not null default 'message',
  title text,
  body text,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists notifications_recipient_message_uniq
  on public.notifications (recipient_id, message_id);
create index if not exists notifications_recipient_created_idx
  on public.notifications (recipient_id, created_at desc);
create index if not exists notifications_recipient_unread_idx
  on public.notifications (recipient_id, read_at) where read_at is null;

alter table public.notifications enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'notifications' and policyname = 'Recipients read notifications') then
    create policy "Recipients read notifications" on public.notifications
      for select using (auth.uid() = recipient_id);
  end if;

  if not exists (select 1 from pg_policies where tablename = 'notifications' and policyname = 'Recipients update notifications') then
    create policy "Recipients update notifications" on public.notifications
      for update using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);
  end if;
end$$;

-- -----------------------------
-- 3) Trigger: create notification rows on message insert
-- -----------------------------
create or replace function public.notify_on_message_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  notif_body text;
begin
  notif_body := coalesce(nullif(new.content, ''), '[Attachment]');

  for r in
    select cm.user_id
    from public.conversation_members cm
    where cm.conversation_id = new.conversation_id
      and cm.user_id <> new.sender_id
  loop
    insert into public.notifications (recipient_id, actor_id, conversation_id, message_id, type, title, body, data)
    values (
      r.user_id,
      new.sender_id,
      new.conversation_id,
      new.id,
      'message',
      'New message',
      left(notif_body, 240),
      jsonb_build_object('conversation_id', new.conversation_id, 'message_id', new.id)
    )
    on conflict (recipient_id, message_id) do nothing;
  end loop;

  return new;
end;
$$;

drop trigger if exists messages_notify_on_insert on public.messages;
create trigger messages_notify_on_insert
after insert on public.messages
for each row execute procedure public.notify_on_message_insert();

-- -----------------------------
-- 4) IMPORTANT: Enable Realtime for notifications
-- -----------------------------
-- In Supabase Dashboard -> Database -> Replication, enable Realtime for:
--   - public.messages
--   - public.notifications
--   - public.conversation_members (optional)
--
-- Or run this SQL to enable realtime publication:
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversation_members;

-- -----------------------------
-- 5) If the app says "Could not find the function ... in the schema cache"
-- -----------------------------
-- Run this after applying the patch:
NOTIFY pgrst, 'reload schema';


