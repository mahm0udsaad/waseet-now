-- Supabase schema for ads, storage, and realtime chat (open-source stack)
-- Run with the service role key (SQL editor) or supabase CLI.

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- Storage buckets
insert into storage.buckets (id, name, public)
values ('ads', 'ads', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('chat', 'chat', false)
on conflict (id) do nothing;

-- Ads core table
create table if not exists public.ads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  type text not null check (type in ('tanazul','taqib','dhamen')),
  title text not null,
  description text,
  price numeric(12,2),
  location text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ads_type_created_at_idx on public.ads (type, created_at desc);

-- Ad images (stored in storage bucket `ads`)
create table if not exists public.ad_images (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid references public.ads(id) on delete cascade,
  storage_path text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists ad_images_ad_id_idx on public.ad_images (ad_id);

-- Conversations
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'dm' check (type in ('dm','group')),
  created_at timestamptz not null default now()
);

-- Conversation members
create table if not exists public.conversation_members (
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index if not exists conversation_members_user_idx on public.conversation_members (user_id);

-- Messages
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete cascade,
  content text,
  attachments jsonb not null default '[]'::jsonb, -- array of { type, path, mimeType, name, size }
  created_at timestamptz not null default now()
);

create index if not exists messages_conv_created_idx on public.messages (conversation_id, created_at desc);

-- In-app notifications (no push)
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

-- Updated at trigger for ads
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists ads_set_updated_at on public.ads;
create trigger ads_set_updated_at
before update on public.ads
for each row
execute procedure public.set_updated_at();

-- RLS
alter table public.ads enable row level security;
alter table public.ad_images enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table storage.objects enable row level security;

-- Ads policies
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'ads' and policyname = 'Public read ads') then
    create policy "Public read ads" on public.ads
      for select using (true);
  end if;

  if not exists (select 1 from pg_policies where tablename = 'ads' and policyname = 'Owners insert ads') then
    create policy "Owners insert ads" on public.ads
      for insert with check (auth.uid() = owner_id);
  end if;

  if not exists (select 1 from pg_policies where tablename = 'ads' and policyname = 'Owners update ads') then
    create policy "Owners update ads" on public.ads
      for update using (auth.uid() = owner_id);
  end if;

  if not exists (select 1 from pg_policies where tablename = 'ads' and policyname = 'Owners delete ads') then
    create policy "Owners delete ads" on public.ads
      for delete using (auth.uid() = owner_id);
  end if;
end$$;

-- Ad images policies
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'ad_images' and policyname = 'Public read ad images') then
    create policy "Public read ad images" on public.ad_images
      for select using (true);
  end if;

  if not exists (select 1 from pg_policies where tablename = 'ad_images' and policyname = 'Owners write ad images') then
    create policy "Owners write ad images" on public.ad_images
      for all using (
        exists (
          select 1 from public.ads a
          where a.id = ad_id and a.owner_id = auth.uid()
        )
      ) with check (
        exists (
          select 1 from public.ads a
          where a.id = ad_id and a.owner_id = auth.uid()
        )
      );
  end if;
end$$;

-- Conversations policies
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'conversations' and policyname = 'Members select conversations') then
    create policy "Members select conversations" on public.conversations
      for select using (
        exists (
          select 1 from public.conversation_members cm
          where cm.conversation_id = conversations.id
            and cm.user_id = auth.uid()
        )
      );
  end if;

  if not exists (select 1 from pg_policies where tablename = 'conversations' and policyname = 'Anyone create conversation') then
    create policy "Anyone create conversation" on public.conversations
      for insert with check (true);
  end if;
end$$;

-- Conversation members policies
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'conversation_members' and policyname = 'Members manage membership') then
    create policy "Members manage membership" on public.conversation_members
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end$$;

-- RPC: create a DM conversation between the current user and another user.
-- This is required because the client cannot insert another user's row into `conversation_members` under RLS.
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

-- Allow signed-in users to call the RPC
revoke all on function public.create_dm_conversation(uuid) from public;
grant execute on function public.create_dm_conversation(uuid) to authenticated;

-- If the mobile app shows: "Could not find the function ... in the schema cache"
-- run this once in Supabase SQL editor, then retry:
--   NOTIFY pgrst, 'reload schema';

-- Messages policies
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'messages' and policyname = 'Members read messages') then
    create policy "Members read messages" on public.messages
      for select using (
        exists (
          select 1 from public.conversation_members cm
          where cm.conversation_id = messages.conversation_id
            and cm.user_id = auth.uid()
        )
      );
  end if;

  if not exists (select 1 from pg_policies where tablename = 'messages' and policyname = 'Members send messages') then
    create policy "Members send messages" on public.messages
      for insert with check (
        auth.uid() = sender_id
        and exists (
          select 1 from public.conversation_members cm
          where cm.conversation_id = conversation_id
            and cm.user_id = auth.uid()
        )
      );
  end if;
end$$;

-- Notifications policies (recipient only)
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

-- Trigger: when a message is inserted, create an in-app notification for other conversation members
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
  -- Fallback body for attachments-only messages
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

-- Storage policies
do $$
begin
  -- Ads bucket: public read, owner write (path prefix = auth.uid())
  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'Public read ads bucket') then
    create policy "Public read ads bucket" on storage.objects
      for select using (bucket_id = 'ads');
  end if;

  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'Owners write ads bucket') then
    create policy "Owners write ads bucket" on storage.objects
      for all using (
        bucket_id = 'ads'
        and auth.uid() is not null
        and position(auth.uid()::text || '/' in objects.name) = 1
      ) with check (
        bucket_id = 'ads'
        and auth.uid() is not null
        and position(auth.uid()::text || '/' in objects.name) = 1
      );
  end if;

  -- Chat bucket: authenticated users can read, users can write to their own folder
  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'Members read chat bucket') then
    create policy "Members read chat bucket" on storage.objects
      for select using (bucket_id = 'chat' and auth.uid() is not null);
  end if;

  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'Chat bucket insert') then
    create policy "Chat bucket insert" on storage.objects
      for insert with check (
        bucket_id = 'chat'
        and auth.uid() is not null
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'Chat bucket update') then
    create policy "Chat bucket update" on storage.objects
      for update using (
        bucket_id = 'chat'
        and auth.uid() is not null
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'Chat bucket delete') then
    create policy "Chat bucket delete" on storage.objects
      for delete using (
        bucket_id = 'chat'
        and auth.uid() is not null
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;
end$$;

-- Seed sample users (service role only; optional)
-- delete from auth.users where email like 'demo-%';
insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'demo-alice@example.com', crypt('demo1234', gen_salt('bf')), now(), '{"name":"Alice Demo"}'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'demo-bob@example.com', crypt('demo1234', gen_salt('bf')), now(), '{"name":"Bob Demo"}')
on conflict (id) do nothing;

-- Seed minimal conversations/messages for testing
with conv as (
  insert into public.conversations (type) values ('dm')
  returning id
)
insert into public.conversation_members (conversation_id, user_id)
select id, user_id from (
  select (select id from conv) as id, '00000000-0000-0000-0000-000000000001'::uuid as user_id
  union all
  select (select id from conv), '00000000-0000-0000-0000-000000000002'::uuid
) t
on conflict do nothing;

insert into public.messages (conversation_id, sender_id, content)
select (select id from public.conversations limit 1), '00000000-0000-0000-0000-000000000001', 'Welcome to the realtime chat demo.'
on conflict do nothing;

-- Seed example ads
insert into public.ads (owner_id, type, title, description, price, location, metadata)
values
  ('00000000-0000-0000-0000-000000000001', 'tanazul', 'Filipino Worker Transfer', 'Cook, Riyadh', 8500, 'Riyadh', '{"nationality":"Filipino","profession":"Cook","age":28,"previousTransfers":1,"contractDuration":"10 months"}'),
  ('00000000-0000-0000-0000-000000000001', 'taqib', 'Passport Services', 'Follow-up with Jawazat', null, 'Jeddah', '{"availableServices":"Passport / Jawazat follow-up","category":"passport"}'),
  ('00000000-0000-0000-0000-000000000002', 'dhamen', 'Service Guarantee', 'Guarantee for service', 1200, 'Dammam', '{"serviceOwnerMobile":"+966500000001","serviceProviderMobile":"+966500000002","completionDays":5}')
on conflict do nothing;

-- Helpful view for debugging (optional)
create or replace view public.v_ad_full as
select a.*, ai.storage_path
from public.ads a
left join public.ad_images ai on ai.ad_id = a.id;

