-- Airport chat initiation (user-side)
-- Applied: 2026-04-16
--
-- Lets an airport-request owner open a chat with an admin right after payment
-- without waiting for an admin to open it manually.
--
-- Idempotent: if the request already has a conversation_id, returns the same pair.
-- Admin selection priority:
--   1. public.app_settings['airport_admin_user_id'] (optional operator override)
--   2. first active 'admin'
--   3. first active 'support_agent'
--   4. first active 'super_admin' (last resort)
--
-- Note: output columns are prefixed `out_` because `returns table (conversation_id ...)`
-- exposes them as variables inside the function body, which collides with the
-- `conversation_id` column on `airport_inspection_requests` in the UPDATE.

drop function if exists public.user_create_airport_chat(uuid);

create or replace function public.user_create_airport_chat(p_request_id uuid)
returns table (out_conversation_id uuid, out_admin_user_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req_id uuid;
  v_req_user uuid;
  v_req_conv uuid;
  v_admin uuid;
  v_conv uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select air.id, air.user_id, air.conversation_id
    into v_req_id, v_req_user, v_req_conv
    from public.airport_inspection_requests air
   where air.id = p_request_id;
  if not found then
    raise exception 'Airport request not found';
  end if;
  if v_req_user <> auth.uid() then
    raise exception 'Not authorized for this airport request';
  end if;

  -- 1. Operator override via app_settings
  select nullif(s.value->>'user_id', '')::uuid
    into v_admin
    from public.app_settings s
   where s.key = 'airport_admin_user_id';

  -- 2. Active admin
  if v_admin is null then
    select p.user_id into v_admin
      from public.profiles p
     where p.role = 'admin' and coalesce(p.status, 'active') = 'active'
     order by p.created_at asc
     limit 1;
  end if;

  -- 3. Active support agent
  if v_admin is null then
    select p.user_id into v_admin
      from public.profiles p
     where p.role = 'support_agent' and coalesce(p.status, 'active') = 'active'
     order by p.created_at asc
     limit 1;
  end if;

  -- 4. Super admin fallback
  if v_admin is null then
    select p.user_id into v_admin
      from public.profiles p
     where p.role = 'super_admin' and coalesce(p.status, 'active') = 'active'
     order by p.created_at asc
     limit 1;
  end if;

  if v_admin is null then
    raise exception 'No admin available to host the airport chat';
  end if;

  -- Reuse the existing conversation if one is already attached.
  if v_req_conv is not null then
    return query select v_req_conv, v_admin;
    return;
  end if;

  insert into public.conversations (type)
  values ('dm')
  returning id into v_conv;

  insert into public.conversation_members (conversation_id, user_id)
  values (v_conv, v_req_user)
  on conflict do nothing;

  insert into public.conversation_members (conversation_id, user_id)
  values (v_conv, v_admin)
  on conflict do nothing;

  update public.airport_inspection_requests air
     set conversation_id = v_conv
   where air.id = p_request_id;

  return query select v_conv, v_admin;
end;
$$;

revoke all on function public.user_create_airport_chat(uuid) from public;
grant execute on function public.user_create_airport_chat(uuid) to authenticated;

-- Reminder: if "Could not find the function" error shows up, run:
-- NOTIFY pgrst, 'reload schema';
