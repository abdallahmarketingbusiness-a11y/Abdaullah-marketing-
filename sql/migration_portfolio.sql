-- migration_portfolio.sql
-- نفّذ هذا الملف كامل في: Supabase Dashboard → SQL Editor → New Query → Run
-- ملحوظة: الملف ده إضافي، بيبني فوق schema.sql الأساسي (جدول admins + is_admin() لازم يكونوا موجودين قبله).
-- مفيهوش أي تعارض مع جدول packages الموجود.

-- ============================================================================
-- 1) معرض الأعمال (Portfolio)
-- ============================================================================
create table if not exists portfolio_items (
  id uuid primary key default gen_random_uuid(),

  title text not null,
  short_description text default '',
  full_description text default '',

  main_image_url text,
  video_url text default '',

  category text not null default 'عام',
  client_name text default '',
  execution_date date,

  status text not null default 'draft' check (status in ('published', 'draft', 'hidden')),
  is_featured boolean not null default false,
  sort_order integer not null default 0,

  views_count integer not null default 0,
  requests_count integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_portfolio_status on portfolio_items(status);
create index if not exists idx_portfolio_category on portfolio_items(category);
create index if not exists idx_portfolio_sort on portfolio_items(sort_order);
create index if not exists idx_portfolio_featured on portfolio_items(is_featured);
create index if not exists idx_portfolio_created_at on portfolio_items(created_at desc);

drop trigger if exists trg_portfolio_updated_at on portfolio_items;
create trigger trg_portfolio_updated_at
  before update on portfolio_items
  for each row execute function set_updated_at();

-- صور إضافية (Gallery) لكل عمل
create table if not exists portfolio_images (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references portfolio_items(id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_portfolio_images_portfolio on portfolio_images(portfolio_id);

-- ملفات المشروع الداخلية (PSD / AI / PDF) — للأدمن بس
create table if not exists portfolio_source_files (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references portfolio_items(id) on delete cascade,
  file_url text not null,
  file_name text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_portfolio_source_files_portfolio on portfolio_source_files(portfolio_id);

alter table portfolio_items enable row level security;
alter table portfolio_images enable row level security;
alter table portfolio_source_files enable row level security;

-- القراءة: الزوار يشوفوا المنشور بس، الأدمن يشوف الكل
drop policy if exists portfolio_items_select on portfolio_items;
create policy portfolio_items_select on portfolio_items
  for select
  using (status = 'published' or is_admin());

drop policy if exists portfolio_items_write on portfolio_items;
create policy portfolio_items_write on portfolio_items
  for all
  using (is_admin())
  with check (is_admin());

-- صور المعرض: تتبع حالة العمل الأساسي
drop policy if exists portfolio_images_select on portfolio_images;
create policy portfolio_images_select on portfolio_images
  for select
  using (
    is_admin()
    or exists (select 1 from portfolio_items p where p.id = portfolio_id and p.status = 'published')
  );

drop policy if exists portfolio_images_write on portfolio_images;
create policy portfolio_images_write on portfolio_images
  for all
  using (is_admin())
  with check (is_admin());

-- ملفات المصدر: أدمن فقط قراءة وكتابة (داخلية)
drop policy if exists portfolio_source_files_admin_only on portfolio_source_files;
create policy portfolio_source_files_admin_only on portfolio_source_files
  for all
  using (is_admin())
  with check (is_admin());

-- ============================================================================
-- 2) الشهادات (Certificates)
-- ============================================================================
create table if not exists testimonials (
  id uuid primary key default gen_random_uuid(),

  certificate_name text not null,
  issuer text not null,
  issue_date date,
  description text default '',
  image_url text,
  verify_url text default '',

  status text not null default 'visible' check (status in ('visible', 'hidden')),
  sort_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_testimonials_status on testimonials(status);
create index if not exists idx_testimonials_sort on testimonials(sort_order);

drop trigger if exists trg_testimonials_updated_at on testimonials;
create trigger trg_testimonials_updated_at
  before update on testimonials
  for each row execute function set_updated_at();

alter table testimonials enable row level security;

drop policy if exists testimonials_select on testimonials;
create policy testimonials_select on testimonials
  for select
  using (status = 'visible' or is_admin());

drop policy if exists testimonials_write on testimonials;
create policy testimonials_write on testimonials
  for all
  using (is_admin())
  with check (is_admin());

-- ============================================================================
-- 3) صفحة "من نحن" (سطر واحد بيتحدث بالكامل)
-- ============================================================================
create table if not exists about_page (
  id integer primary key default 1,
  avatar_url text default '',
  cover_url text default '',
  full_name text default '',
  job_title text default '',
  bio text default '',
  skills jsonb default '[]'::jsonb,      -- ["مهارة 1", "مهارة 2", ...]
  stats jsonb default '[]'::jsonb,       -- [{"label":"عميل", "value":"120+"}, ...]
  social_links jsonb default '{}'::jsonb,-- {"facebook":"...", "instagram":"...", ...}
  cv_url text default '',
  updated_at timestamptz not null default now(),

  constraint about_page_single_row check (id = 1)
);

insert into about_page (id) values (1) on conflict (id) do nothing;

drop trigger if exists trg_about_page_updated_at on about_page;
create trigger trg_about_page_updated_at
  before update on about_page
  for each row execute function set_updated_at();

alter table about_page enable row level security;

drop policy if exists about_page_select on about_page;
create policy about_page_select on about_page
  for select
  using (true);

drop policy if exists about_page_write on about_page;
create policy about_page_write on about_page
  for update
  using (is_admin())
  with check (is_admin());

-- ============================================================================
-- 4) إعدادات الموقع العامة (سطر واحد بردو)
-- ============================================================================
create table if not exists site_settings (
  id integer primary key default 1,
  site_name text default 'Abdullah Marketing',
  logo_url text default '',
  whatsapp_numbers jsonb default '[]'::jsonb, -- ["201069032563", ...]
  email text default '',
  social_links jsonb default '{}'::jsonb,
  seo_title text default '',
  seo_description text default '',
  updated_at timestamptz not null default now(),

  constraint site_settings_single_row check (id = 1)
);

insert into site_settings (id) values (1) on conflict (id) do nothing;

drop trigger if exists trg_site_settings_updated_at on site_settings;
create trigger trg_site_settings_updated_at
  before update on site_settings
  for each row execute function set_updated_at();

alter table site_settings enable row level security;

drop policy if exists site_settings_select on site_settings;
create policy site_settings_select on site_settings
  for select
  using (true);

drop policy if exists site_settings_write on site_settings;
create policy site_settings_write on site_settings
  for update
  using (is_admin())
  with check (is_admin());

-- ============================================================================
-- 5) سجل النشاط (Activity Log) — أدمن فقط
-- ============================================================================
create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_email text,
  action text not null,       -- create / update / delete / status_change ...
  entity_type text not null,  -- portfolio_items / testimonials / about_page ...
  entity_id text,
  details jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_activity_log_created_at on activity_log(created_at desc);
create index if not exists idx_activity_log_entity on activity_log(entity_type, entity_id);

alter table activity_log enable row level security;

drop policy if exists activity_log_admin_only on activity_log;
create policy activity_log_admin_only on activity_log
  for all
  using (is_admin())
  with check (is_admin());

-- ============================================================================
-- 6) طلبات التصميم (لعداد "أكثر الأعمال طلبًا" في الداشبورد + سجل الطلبات)
-- ============================================================================
create table if not exists design_requests (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid references portfolio_items(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_design_requests_portfolio on design_requests(portfolio_id);

alter table design_requests enable row level security;

-- أي زائر يقدر يسجل إنه طلب تصميم (عشان زرار "اطلب تصميم مشابه" يشتغل بدون تسجيل دخول)
drop policy if exists design_requests_insert on design_requests;
create policy design_requests_insert on design_requests
  for insert
  with check (true);

drop policy if exists design_requests_select on design_requests;
create policy design_requests_select on design_requests
  for select
  using (is_admin());

-- ============================================================================
-- 7) Storage Buckets
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('portfolio', 'portfolio', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('about', 'about', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('site', 'site', true)
on conflict (id) do nothing;

-- ملفات المصدر (PSD/AI/PDF) — Bucket خاص مش Public
insert into storage.buckets (id, name, public)
values ('portfolio-sources', 'portfolio-sources', false)
on conflict (id) do nothing;

-- سياسات الـ Storage: أي حد يقرأ الصور العامة، الأدمن بس يرفع/يعدّل/يحذف
drop policy if exists "portfolio_public_read" on storage.objects;
create policy "portfolio_public_read" on storage.objects
  for select using (bucket_id in ('portfolio', 'about', 'site'));

drop policy if exists "portfolio_admin_write" on storage.objects;
create policy "portfolio_admin_write" on storage.objects
  for insert with check (bucket_id in ('portfolio', 'about', 'site') and is_admin());

drop policy if exists "portfolio_admin_update" on storage.objects;
create policy "portfolio_admin_update" on storage.objects
  for update using (bucket_id in ('portfolio', 'about', 'site') and is_admin());

drop policy if exists "portfolio_admin_delete" on storage.objects;
create policy "portfolio_admin_delete" on storage.objects
  for delete using (bucket_id in ('portfolio', 'about', 'site') and is_admin());

-- ملفات المصدر الداخلية: أدمن فقط قراءة وكتابة
drop policy if exists "portfolio_sources_admin_all" on storage.objects;
create policy "portfolio_sources_admin_all" on storage.objects
  for all
  using (bucket_id = 'portfolio-sources' and is_admin())
  with check (bucket_id = 'portfolio-sources' and is_admin());

-- ============================================================================
-- خلاص. الجداول دي كلها بتعتمد على is_admin() و admins اللي اتعملوا في schema.sql
-- الأساسي. لو لسه ما نفذتهوش، نفّذه الأول.
-- ============================================================================
