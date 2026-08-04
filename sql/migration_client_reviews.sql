-- migration_client_reviews.sql
-- نفّذ هذا الملف كامل في: Supabase Dashboard → SQL Editor → New Query → Run
-- ملحوظة: بيبني فوق schema.sql الأساسي (جدول admins + is_admin() + set_updated_at() لازم يكونوا موجودين قبله).
-- بيضيف جدول تقييمات العملاء (صورة العميل، الاسم، اسم الشركة، عدد النجوم،
-- التعليق، تاريخ التقييم) — بنفس منطق الحماية المستخدم في باقي الجداول (is_admin()).

-- ============================================================================
-- تقييمات العملاء (Client Reviews)
-- ============================================================================
create table if not exists client_reviews (
  id uuid primary key default gen_random_uuid(),

  client_name text not null,
  company_name text default '',      -- اختياري
  avatar_url text default '',        -- اختياري — صورة العميل
  rating integer not null default 5 check (rating between 1 and 5),
  comment text not null default '',
  review_date date not null default current_date,

  status text not null default 'visible' check (status in ('visible', 'hidden')),
  sort_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_client_reviews_status on client_reviews(status);
create index if not exists idx_client_reviews_sort on client_reviews(sort_order);
create index if not exists idx_client_reviews_date on client_reviews(review_date desc);

drop trigger if exists trg_client_reviews_updated_at on client_reviews;
create trigger trg_client_reviews_updated_at
  before update on client_reviews
  for each row execute function set_updated_at();

alter table client_reviews enable row level security;

drop policy if exists client_reviews_select on client_reviews;
create policy client_reviews_select on client_reviews
  for select
  using (status = 'visible' or is_admin());

drop policy if exists client_reviews_write on client_reviews;
create policy client_reviews_write on client_reviews
  for all
  using (is_admin())
  with check (is_admin());

-- ============================================================================
-- Storage bucket لصور العملاء (لو لسه مش موجود) — نفس اسم الـ bucket المستخدم
-- في service/reviewsService.js (STORAGE_BUCKETS.ABOUT بيتشارك معاه برضو)
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('reviews', 'reviews', true)
on conflict (id) do nothing;

drop policy if exists reviews_bucket_public_read on storage.objects;
create policy reviews_bucket_public_read on storage.objects
  for select
  using (bucket_id = 'reviews');

drop policy if exists reviews_bucket_admin_write on storage.objects;
create policy reviews_bucket_admin_write on storage.objects
  for all
  using (bucket_id = 'reviews' and is_admin())
  with check (bucket_id = 'reviews' and is_admin());
