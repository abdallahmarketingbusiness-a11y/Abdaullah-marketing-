-- patch_site_posts_extra.sql
-- نفّذ هذا الملف في: Supabase Dashboard → SQL Editor → New Query → Run
-- (بعد ما تكون نفّذت migration_site_posts.sql قبل كده)
--
-- بيضيف لجدول site_posts:
--   is_pinned      تثبيت المنشور في الأعلى فوق كل المنشورات التانية
--   scheduled_at   جدولة النشر (المنشور "منشور" بس مش هيظهر للزوار غير لما
--                  الوقت ده يجي؛ لو فاضي = يظهر فورًا زي الوضع الحالي)
--   gallery_urls   صور إضافية غير صورة الغلاف
-- الأمر ده آمن 100% (safe/additive)، مش هيأثر على أي بيانات موجودة.

alter table site_posts add column if not exists is_pinned boolean not null default false;
alter table site_posts add column if not exists scheduled_at timestamptz;
alter table site_posts add column if not exists gallery_urls text[] not null default '{}';

create index if not exists idx_site_posts_pinned on site_posts(is_pinned);

-- تحديث سياسة القراءة العامة عشان تاخد الجدولة في الاعتبار (الأدمن دايمًا
-- بيشوف كل حاجة، is_admin() أول شرط زي ما هو)
drop policy if exists site_posts_select on site_posts;
create policy site_posts_select on site_posts
  for select
  using (
    is_admin()
    or (
      status = 'published'
      and (scheduled_at is null or scheduled_at <= now())
    )
  );
