-- Airport Inspection & Delivery Service + Pinned Ads
-- Applied: 2026-04-10

-- =========================================================
-- 1. Pinned ads flag (independent of sort_order)
-- =========================================================
alter table public.ads
  add column if not exists is_pinned boolean not null default false,
  add column if not exists pinned_at timestamptz;

create index if not exists ads_type_pinned_idx
  on public.ads (type, is_pinned, pinned_at desc)
  where is_pinned = true;

-- =========================================================
-- 2. Airport inspection & delivery service requests
-- =========================================================
create table if not exists public.airport_inspection_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Sponsor (الكفيل)
  sponsor_name       text not null,
  sponsor_phone      text not null,
  sponsor_alt_phone  text,

  -- Worker (العاملة)
  worker_name        text not null,
  worker_nationality text not null,
  flight_date        date not null,
  flight_time        time not null,

  -- Uploads (storage paths in airport-requests bucket)
  exit_visa_path  text,
  ticket_path     text,

  -- Admin/payment state
  status text not null default 'pending_payment'
    check (status in (
      'pending_payment',
      'awaiting_admin_transfer_approval',
      'paid',
      'in_progress',
      'completed',
      'cancelled',
      'rejected'
    )),
  price numeric(12,2) not null,
  payment_method text,
  payment_ref    text,
  admin_notes    text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists airport_requests_user_idx
  on public.airport_inspection_requests (user_id, created_at desc);
create index if not exists airport_requests_status_idx
  on public.airport_inspection_requests (status, created_at desc);

-- Auto-update updated_at
create or replace function public.set_airport_requests_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_airport_requests_updated_at on public.airport_inspection_requests;
create trigger trg_airport_requests_updated_at
  before update on public.airport_inspection_requests
  for each row execute function public.set_airport_requests_updated_at();

-- RLS
alter table public.airport_inspection_requests enable row level security;

drop policy if exists "users read own airport requests" on public.airport_inspection_requests;
create policy "users read own airport requests"
  on public.airport_inspection_requests for select
  using (auth.uid() = user_id);

drop policy if exists "users insert own airport requests" on public.airport_inspection_requests;
create policy "users insert own airport requests"
  on public.airport_inspection_requests for insert
  with check (auth.uid() = user_id);

drop policy if exists "users update own pending airport requests" on public.airport_inspection_requests;
create policy "users update own pending airport requests"
  on public.airport_inspection_requests for update
  using (auth.uid() = user_id and status in ('pending_payment','awaiting_admin_transfer_approval'));

-- =========================================================
-- 3. Airport-requests private storage bucket
-- =========================================================
insert into storage.buckets (id, name, public)
values ('airport-requests', 'airport-requests', false)
on conflict (id) do nothing;

drop policy if exists "users upload own airport docs" on storage.objects;
create policy "users upload own airport docs"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'airport-requests' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users read own airport docs" on storage.objects;
create policy "users read own airport docs"
  on storage.objects for select to authenticated
  using (bucket_id = 'airport-requests' and (storage.foldername(name))[1] = auth.uid()::text);

-- =========================================================
-- 4. Service price setting (default 500 SAR)
-- =========================================================
insert into public.commission_settings (key, value)
values ('airport_service_price', jsonb_build_object('amount', 500))
on conflict (key) do nothing;
