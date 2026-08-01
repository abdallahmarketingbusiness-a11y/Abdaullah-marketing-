-- migration_site_posts.sql
-- نفّذ هذا الملف كامل في: Supabase Dashboard → SQL Editor → New Query → Run
-- ملحوظة: بيبني فوق schema.sql الأساسي (جدول admins + is_admin() + set_updated_at() لازم يكونوا موجودين قبله).
--
-- ده جدول "منشورات الموقع" الجديد: نصائح تسويقية، عروض، خصومات، أخبار الشركة،
-- تحديثات، توعية، أفكار جديدة، وإعلانات — منفصل تمامًا عن معرض الأعمال
-- (المشاريع المنفذة) وعن جدول social_posts القديم (نماذج بوستات/فيديوهات
-- بننفذها للعملاء، واللي دلوقتي بيتعرض جوه معرض الأعمال).

create table if not exists site_posts (
  id uuid primary key default gen_random_uuid(),

  title text not null,
  category text not null default 'update'
    check (category in ('tip', 'offer', 'discount', 'news', 'update', 'awareness', 'idea', 'announcement')),

  excerpt text default '',           -- وصف مختصر يظهر في الـ Card
  content text default '',           -- المحتوى الكامل (يظهر في صفحة المنشور المستقلة)
  caption text default '',           -- كابشن إضافي يظهر تحت الصورة في صفحة المنشور
  cover_image_url text default '',

  author text default 'Abdullah Marketing',
  read_time_minutes integer default 3,
  tags text[] not null default '{}', -- تستخدم لاقتراح "منشورات مشابهة"

  views_count integer not null default 0,

  status text not null default 'published' check (status in ('published', 'draft', 'hidden')),
  sort_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_site_posts_status on site_posts(status);
create index if not exists idx_site_posts_category on site_posts(category);
create index if not exists idx_site_posts_sort on site_posts(sort_order);
create index if not exists idx_site_posts_created on site_posts(created_at desc);

drop trigger if exists trg_site_posts_updated_at on site_posts;
create trigger trg_site_posts_updated_at
  before update on site_posts
  for each row execute function set_updated_at();

alter table site_posts enable row level security;

drop policy if exists site_posts_select on site_posts;
create policy site_posts_select on site_posts
  for select
  using (status = 'published' or is_admin());

drop policy if exists site_posts_write on site_posts;
create policy site_posts_write on site_posts
  for all
  using (is_admin())
  with check (is_admin());

-- دالة زيادة عداد المشاهدات (best-effort، نفس أسلوب increment_portfolio_views)
create or replace function increment_site_post_views(row_id uuid)
returns void as $$
begin
  update site_posts set views_count = views_count + 1 where id = row_id;
end;
$$ language plpgsql security definer;
