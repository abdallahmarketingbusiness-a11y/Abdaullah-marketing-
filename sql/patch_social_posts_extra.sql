-- patch_social_posts_extra.sql
-- نفّذ هذا الملف في: Supabase Dashboard → SQL Editor → New Query → Run
-- (بعد ما تكون نفّذت migration_content.sql قبل كده)
--
-- بيضيف لجدول social_posts (قسم "🖼️ المنشورات" في تبويب المحتوى):
--   caption        نص الكابشن (منفصل عن العنوان الإداري)
--   content        المحتوى الكامل للمنشور
--   category       التصنيف
--   tags           الوسوم
--   gallery_urls   صور إضافية (غير صورة الغلاف media_url)
--   is_pinned      تثبيت المنشور في الأعلى
--   scheduled_at   جدولة النشر (المنشور "منشور" بس مش هيظهر عالعامة غير
--                  لما الوقت ده يجي؛ لو فاضي = يظهر فورًا زي الوضع الحالي)
-- الأمر ده آمن 100% (safe/additive)، مش هيأثر على أي بيانات موجودة.

alter table social_posts add column if not exists caption text default '';
alter table social_posts add column if not exists content text default '';
alter table social_posts add column if not exists category text default '';
alter table social_posts add column if not exists tags text[] not null default '{}';
alter table social_posts add column if not exists gallery_urls text[] not null default '{}';
alter table social_posts add column if not exists is_pinned boolean not null default false;
alter table social_posts add column if not exists scheduled_at timestamptz;

create index if not exists idx_social_posts_pinned on social_posts(is_pinned);

-- تحديث سياسة القراءة العامة عشان تاخد الجدولة في الاعتبار (الأدمن دايمًا
-- بيشوف كل حاجة، is_admin() أول شرط زي ما هو)
drop policy if exists social_posts_select on social_posts;
create policy social_posts_select on social_posts
  for select
  using (
    is_admin()
    or (
      status = 'published'
      and (scheduled_at is null or scheduled_at <= now())
    )
  );
