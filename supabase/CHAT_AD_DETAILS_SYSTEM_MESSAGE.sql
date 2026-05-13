-- Patch: Ad Details System Message
-- Adds a `type` column to messages so the first message in a new Tanazul chat
-- can be displayed as an informational card instead of a chat bubble.
-- Safe to run multiple times (idempotent).

-- 1. Add type column to messages (default 'user' so existing messages are unaffected)
alter table public.messages
  add column if not exists type text not null default 'user';

-- 2. Update the notification trigger so system messages never produce
--    in-app notification rows (they are informational, not user-sent).
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
  -- Skip notifications for system-generated messages
  if new.type = 'system' then
    return new;
  end if;

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

-- Reload schema cache so PostgREST picks up the new column
NOTIFY pgrst, 'reload schema';
