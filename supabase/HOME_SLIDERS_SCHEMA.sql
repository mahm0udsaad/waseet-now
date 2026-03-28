-- Home sliders for mobile app homepage
-- Allows admin dashboard to control banner content, gradient palette, and optional background image.

create table if not exists public.home_sliders (
  id uuid primary key default gen_random_uuid(),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  badge_en text not null,
  badge_ar text not null,
  title_en text not null,
  title_ar text not null,
  subtitle_en text not null,
  subtitle_ar text not null,
  gradient_palette text not null
    check (gradient_palette in (
      'amber_burst',
      'emerald_flow',
      'violet_rush',
      'ocean_wave',
      'rose_glow',
      'slate_night'
    )),
  icon_name text not null default 'shield'
    check (icon_name in ('trending_up', 'check_circle', 'zap', 'shield')),
  background_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists home_sliders_sort_order_idx
  on public.home_sliders (is_active, sort_order asc);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists home_sliders_set_updated_at on public.home_sliders;
create trigger home_sliders_set_updated_at
before update on public.home_sliders
for each row execute procedure public.set_updated_at();

alter table public.home_sliders enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'home_sliders'
      and policyname = 'Public read active sliders'
  ) then
    create policy "Public read active sliders"
    on public.home_sliders
    for select
    using (is_active = true);
  end if;
end $$;

-- NOTE:
-- Dashboard uses service-role or dedicated admin role for insert/update/delete.
-- No open write policy is added here.

insert into public.home_sliders (
  sort_order,
  is_active,
  badge_en,
  badge_ar,
  title_en,
  title_ar,
  subtitle_en,
  subtitle_ar,
  gradient_palette,
  icon_name
)
values
  (
    1, true,
    'Offer', 'عرض',
    'Competitive Pricing', 'أسعار تنافسية',
    'Best value in the market', 'أفضل قيمة في السوق',
    'amber_burst', 'trending_up'
  ),
  (
    2, true,
    'Trusted', 'موثوق',
    'Verified Services', 'خدمات موثقة',
    'Guaranteed and monitored transactions', 'معاملات مضمونة ومراقبة',
    'emerald_flow', 'check_circle'
  ),
  (
    3, true,
    'Fast', 'سريع',
    'Instant Processing', 'معالجة فورية',
    'Get approved within 24 hours', 'احصل على موافقة خلال 24 ساعة',
    'violet_rush', 'zap'
  ),
  (
    4, true,
    'Featured', 'مميز',
    'Secure Your Future', 'أمّن مستقبلك',
    'Trusted services • Safe partnership', 'خدمات موثوقة • شراكة آمنة',
    'ocean_wave', 'shield'
  )
on conflict do nothing;
