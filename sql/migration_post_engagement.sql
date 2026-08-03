-- migration_post_engagement.sql
-- نفّذ هذا الملف في: Supabase Dashboard → SQL Editor → New Query → Run
-- (بعد migration_site_posts.sql — لازم يكون جدول site_posts موجود قبله)
--
-- بيضيف لايك وكومنت لمنشورات الموقع. مفيش أي تسجيل دخول مطلوب من الزائر —
-- اللايك بيتعرّف بجهاز/متصفح الزائر (voter_key) بدل حساب، زي أي موقع عادي.
--
-- الحماية من الألفاظ الخارجة على مرحلتين:
--  1) فلتر JavaScript شامل في الموقع نفسه (lib/profanityFilter.js) — بيمنع
--     إرسال أي تعليق فيه كلمات خادشة قبل ما يوصل لقاعدة البيانات أساسًا.
--  2) طبقة حماية إضافية هنا (CHECK constraint) — احتياط لو حد حاول يتخطى
--     الموقع ويبعت التعليق مباشرة لقاعدة البيانات.

-- ============================================================================
-- 1) اللايكات
-- ============================================================================
create table if not exists site_post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references site_posts(id) on delete cascade,
  voter_key text not null,          -- معرّف عشوائي محفوظ في متصفح الزائر (localStorage)
  created_at timestamptz not null default now(),
  unique (post_id, voter_key)        -- يمنع تكرار اللايك من نفس الجهاز
);

create index if not exists idx_post_likes_post on site_post_likes(post_id);

alter table site_post_likes enable row level security;

-- اللايك مفتوح لأي زائر (بدون تسجيل دخول) — زي أي زرار لايك عادي على موقع.
drop policy if exists site_post_likes_select on site_post_likes;
create policy site_post_likes_select on site_post_likes for select using (true);

drop policy if exists site_post_likes_insert on site_post_likes;
create policy site_post_likes_insert on site_post_likes for insert with check (true);

drop policy if exists site_post_likes_delete on site_post_likes;
create policy site_post_likes_delete on site_post_likes for delete using (true);

-- ============================================================================
-- 2) الكومنتات
-- ============================================================================
create table if not exists site_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references site_posts(id) on delete cascade,
  author_name text not null,
  comment_text text not null,
  status text not null default 'approved' check (status in ('approved', 'hidden')),
  created_at timestamptz not null default now(),

  -- طبقة حماية إضافية على مستوى قاعدة البيانات (احتياط بعد فلتر الموقع):
  -- بترفض أوضح الألفاظ الجنسية/السب الصريح المكتوبة بالعربي أو الإنجليزي.
  constraint chk_comment_no_slurs check (
    comment_text !~* '(نيك|كس|زبي|عرص|متناك|طيز|احا|شرموط|قحبه|قحبة)' and
    comment_text !~* '\y(fuck|f+u+c+k+|shit|bitch|cunt|pussy|dick|asshole|whore)\y' and
    author_name !~* '(نيك|كس|زبي|عرص|متناك|طيز|شرموط|قحبه|قحبة)' and
    author_name !~* '\y(fuck|shit|bitch|cunt|pussy|dick|asshole|whore)\y'
  )
);

create index if not exists idx_post_comments_post on site_post_comments(post_id);
create index if not exists idx_post_comments_status on site_post_comments(status);

alter table site_post_comments enable row level security;

-- التعليقات المعتمدة (approved) ظاهرة لأي زائر. الأدمن بس يقدر يشوف المخفي.
drop policy if exists site_post_comments_select on site_post_comments;
create policy site_post_comments_select on site_post_comments
  for select
  using (status = 'approved' or is_admin());

drop policy if exists site_post_comments_insert on site_post_comments;
create policy site_post_comments_insert on site_post_comments for insert with check (true);

-- إخفاء/حذف تعليق يبقى للأدمن بس (مفيد لو عايز تراجع كومنت لاحقًا من SQL Editor)
drop policy if exists site_post_comments_write on site_post_comments;
create policy site_post_comments_write on site_post_comments
  for update using (is_admin()) with check (is_admin());

drop policy if exists site_post_comments_delete on site_post_comments;
create policy site_post_comments_delete on site_post_comments
  for delete using (is_admin());
