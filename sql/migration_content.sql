-- migration_content.sql
-- نفّذ هذا الملف كامل في: Supabase Dashboard → SQL Editor → New Query → Run
-- ملحوظة: بيبني فوق schema.sql الأساسي (جدول admins + is_admin() + set_updated_at() لازم يكونوا موجودين قبله).
-- بيضيف 3 جداول جديدة: دراسات الحالة، المدونة، والمنشورات (بوستات + فيديوهات) —
-- كلهم بنفس منطق الحماية المستخدم في portfolio_items (is_admin()).

-- ============================================================================
-- 1) دراسات الحالة (Case Studies)
-- ============================================================================
create table if not exists case_studies (
  id uuid primary key default gen_random_uuid(),

  client_name text not null,
  industry text default '',
  badge_stat text default '',        -- مثال: "+320%"
  metric_label text default '',      -- مثال: "تفاعل على السوشيال ميديا خلال 3 شهور"
  summary text default '',
  tags text[] not null default '{}',
  image_url text default '',

  status text not null default 'published' check (status in ('published', 'draft', 'hidden')),
  sort_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_case_studies_status on case_studies(status);
create index if not exists idx_case_studies_sort on case_studies(sort_order);

drop trigger if exists trg_case_studies_updated_at on case_studies;
create trigger trg_case_studies_updated_at
  before update on case_studies
  for each row execute function set_updated_at();

alter table case_studies enable row level security;

drop policy if exists case_studies_select on case_studies;
create policy case_studies_select on case_studies
  for select
  using (status = 'published' or is_admin());

drop policy if exists case_studies_write on case_studies;
create policy case_studies_write on case_studies
  for all
  using (is_admin())
  with check (is_admin());

-- ============================================================================
-- 2) المدونة (Blog)
-- ============================================================================
create table if not exists blog_posts (
  id uuid primary key default gen_random_uuid(),

  title text not null,
  excerpt text default '',
  content text default '',
  category text default '',
  read_time_minutes integer default 4,
  cover_image_url text default '',

  status text not null default 'published' check (status in ('published', 'draft', 'hidden')),
  sort_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_blog_posts_status on blog_posts(status);
create index if not exists idx_blog_posts_sort on blog_posts(sort_order);

drop trigger if exists trg_blog_posts_updated_at on blog_posts;
create trigger trg_blog_posts_updated_at
  before update on blog_posts
  for each row execute function set_updated_at();

alter table blog_posts enable row level security;

drop policy if exists blog_posts_select on blog_posts;
create policy blog_posts_select on blog_posts
  for select
  using (status = 'published' or is_admin());

drop policy if exists blog_posts_write on blog_posts;
create policy blog_posts_write on blog_posts
  for all
  using (is_admin())
  with check (is_admin());

-- ============================================================================
-- 3) المنشورات — بوستات وفيديوهات (Social Posts)
-- ============================================================================
create table if not exists social_posts (
  id uuid primary key default gen_random_uuid(),

  title text not null,
  platform text not null default 'Instagram',   -- Instagram / Facebook / TikTok ...
  post_type text not null default 'post' check (post_type in ('post', 'video')),
  stat_label text default '',                   -- مثال: "45K مشاهدة"
  media_url text default '',                    -- صورة أو صورة غلاف الفيديو
  video_url text default '',                    -- رابط الفيديو (لو post_type = video)

  status text not null default 'published' check (status in ('published', 'draft', 'hidden')),
  sort_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_social_posts_status on social_posts(status);
create index if not exists idx_social_posts_type on social_posts(post_type);
create index if not exists idx_social_posts_sort on social_posts(sort_order);

drop trigger if exists trg_social_posts_updated_at on social_posts;
create trigger trg_social_posts_updated_at
  before update on social_posts
  for each row execute function set_updated_at();

alter table social_posts enable row level security;

drop policy if exists social_posts_select on social_posts;
create policy social_posts_select on social_posts
  for select
  using (status = 'published' or is_admin());

drop policy if exists social_posts_write on social_posts;
create policy social_posts_write on social_posts
  for all
  using (is_admin())
  with check (is_admin());
