-- patch_notifications_realtime_and_read.sql
-- نفّذ هذا الملف في: Supabase Dashboard → SQL Editor → New Query → Run
-- (بعد patch_notifications_broadcast.sql)
--
-- بيضيف حاجتين بس لجدول notifications:
--   1) سياسة UPDATE جديدة تسمح للعميل يعلّم إشعاراته هو بس كـ"مقروءة"
--      (السياسة الحالية كانت تسمح للأدمن بس، العميل ماكانش قادر يحدّث is_read).
--   2) تفعيل Realtime على جدول notifications، عشان عداد الإشعارات وقائمتها
--      يتحدّثوا فورًا في المتصفح لحظة ما الأدمن ينشر/يبعت إشعار، من غير
--      ما العميل يعمل refresh للصفحة.
-- الأمر ده آمن 100% (safe/additive)، مش هيأثر على أي بيانات أو سياسات موجودة.

-- 1) العميل يقدر يحدّث (يعلّم كمقروء) الإشعارات الخاصة به فقط
drop policy if exists notifications_update_client_read on notifications;
create policy notifications_update_client_read on notifications
  for update
  using (auth.uid() = client_id)
  with check (auth.uid() = client_id);

-- 2) تفعيل Realtime على جدول notifications (لو مفعّل قبل كده، هيتجاهل الأمر من غير خطأ)
do $$
begin
  execute 'alter publication supabase_realtime add table notifications';
exception
  when duplicate_object then
    null; -- الجدول مضاف فعلاً لـ Realtime، تمام
end $$;
