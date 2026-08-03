-- patch_notifications_link.sql
-- نفّذ هذا الملف في: Supabase Dashboard → SQL Editor → New Query → Run
-- (بعد patch_notifications_broadcast.sql و patch_notifications_realtime_and_read.sql)
--
-- بيضيف لجدول notifications عمودين بس:
--   1) link_type: نوع المحتوى المرتبط بالإشعار (مثلاً 'sitePost')، فاضي لو
--      الإشعار "كلامي" عادي (زي إشعار من لوحة الأدمن من غير ربط بمنشور معيّن).
--   2) link_id: id المنشور نفسه، عشان لما العميل يضغط على الإشعار ينتقل
--      لصفحة المنشور مباشرة.
-- الأمر ده آمن 100% (safe/additive)، مش هيأثر على أي بيانات موجودة.

alter table notifications add column if not exists link_type text;
alter table notifications add column if not exists link_id uuid;
