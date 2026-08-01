-- patch_clients_admin.sql
-- نفّذ هذا الملف في: Supabase Dashboard → SQL Editor → New Query → Run
-- (بعد ما تكون نفّذت schema.sql و migration_clients.sql و migration_analytics.sql قبل كده)
--
-- السبب: تبويب "👥 إدارة العملاء" الجديد في لوحة السوبر أدمن بيحتاج الأدمن
-- يقدر يعدّل بيانات أي عميل (الاسم / الهاتف / اسم النشاط) من جدول clients،
-- لكن كان فيه بس policy للـ select (clients_select_admin) — مفيش update.
-- الأمر ده آمن 100% (safe/additive)، مش هيأثر على أي بيانات موجودة.

-- تعديل بيانات أي عميل: الأدمن فقط
drop policy if exists clients_update_admin on clients;
create policy clients_update_admin on clients
  for update
  using (is_admin())
  with check (is_admin());

-- إدراج صف عميل يدويًا (احتياطي — عادة بيتعمل تلقائي عن طريق trigger عند التسجيل)
drop policy if exists clients_insert_admin on clients;
create policy clients_insert_admin on clients
  for insert
  with check (is_admin());

-- حذف صف عميل مباشرة (الحذف الفعلي بيتم عن طريق حذف حساب auth.users من الـ API
-- الجديد وده بيمسح صف clients تلقائيًا بسبب on delete cascade، لكن الـ policy
-- دي موجودة احتياطيًا لأي حالة حذف يدوي).
drop policy if exists clients_delete_admin on clients;
create policy clients_delete_admin on clients
  for delete
  using (is_admin());
