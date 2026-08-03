-- migration_services.sql
-- نفّذ هذا الملف في: Supabase Dashboard → SQL Editor → New Query → Run
-- (بعد schema.sql — لازم يكون فيه admins + is_admin() + set_updated_at() جاهزين)
--
-- بيضيف جدول site_services عشان قسم "خدماتنا الاحترافية" في الصفحة الرئيسية
-- يبقى قابل للإضافة والتعديل من السوبر أدمن (لوحة "المحتوى")، بدل ما يكون
-- ثابت في الكود. نفس منطق الحماية المستخدم في باقي جداول المحتوى.

create table if not exists site_services (
  id uuid primary key default gen_random_uuid(),

  icon text default '🛠️',          -- إيموجي الخدمة (يظهر في الكارت)
  name text not null,               -- اسم الخدمة
  description text default '',      -- وصف مختصر
  tag text default '',              -- تاج إنجليزي صغير تحت الوصف (مثال: RESTAURANT MARKETING)

  status text not null default 'published' check (status in ('published', 'draft', 'hidden')),
  sort_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_site_services_status on site_services(status);
create index if not exists idx_site_services_sort on site_services(sort_order);

drop trigger if exists trg_site_services_updated_at on site_services;
create trigger trg_site_services_updated_at
  before update on site_services
  for each row execute function set_updated_at();

alter table site_services enable row level security;

drop policy if exists site_services_select on site_services;
create policy site_services_select on site_services
  for select
  using (status = 'published' or is_admin());

drop policy if exists site_services_write on site_services;
create policy site_services_write on site_services
  for all
  using (is_admin())
  with check (is_admin());
