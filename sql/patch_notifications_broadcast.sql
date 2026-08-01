-- patch_notifications_broadcast.sql
-- نفّذ هذا الملف في: Supabase Dashboard → SQL Editor → New Query → Run
-- (بعد ما تكون نفّذت migration_client_portal.sql قبل كده)
--
-- بيضيف لجدول notifications بس (من غير باقي جداول بوابة العميل):
--   1) scheduled_at: تاريخ/وقت مستقبلي — الإشعار ميظهرش للعميل غير لما الوقت
--      ده يجي (لو فاضي = يظهر فورًا زي ما هو دلوقتي).
--   2) broadcast_id: لما الأدمن يبعت إشعار "لكل العملاء"، كل الصفوف اللي
--      اتعملت في نفس العملية بتاخد نفس الـ broadcast_id، عشان نقدر نعدّلها/
--      نحذفها كلها مرة واحدة من لوحة الإشعارات بدل ما ندور صف صف.
-- الأمر ده آمن 100% (safe/additive)، مش هيأثر على أي بيانات موجودة.

alter table notifications add column if not exists scheduled_at timestamptz;
alter table notifications add column if not exists broadcast_id uuid;

create index if not exists idx_notifications_broadcast on notifications(broadcast_id);

-- تحديث سياسة القراءة الخاصة بالعميل عشان تاخد الجدولة في الاعتبار
-- (الأدمن دايمًا بيشوف كل حاجة زي ما هي، is_admin() أول شرط)
drop policy if exists notifications_select on notifications;
create policy notifications_select on notifications
  for select
  using (
    is_admin()
    or (
      auth.uid() = client_id
      and is_published = true
      and (scheduled_at is null or scheduled_at <= now())
    )
  );
