-- patch_campaigns_metrics.sql
-- نفّذ هذا الملف في: Supabase Dashboard → SQL Editor → New Query → Run
-- (بعد ما تكون نفّذت sql/migration_client_portal.sql قبل كده)
--
-- سبب الحاجة له: قسم "الحملات الإعلانية" في لوحة العميل بقى بيعرض مقاييس
-- تسويقية أوسع (Impressions / CTR / CPC / Leads / ROI) + حقل ملاحظات، وده
-- محتاج أعمدة جديدة في جدول campaigns اللي أنشأه migration_client_portal.sql.
-- الأمر ده safe/additive بالكامل — بيضيف أعمدة جديدة بقيمة افتراضية 0 (أو
-- فاضية للملاحظات) وما بيأثر على أي صفوف موجودة أصلًا.

alter table campaigns
  add column if not exists impressions numeric not null default 0,   -- مرات الظهور
  add column if not exists ctr numeric not null default 0,           -- نسبة النقر % (Click-Through Rate)
  add column if not exists cpc numeric not null default 0,           -- تكلفة النقرة (ج.م)
  add column if not exists leads numeric not null default 0,         -- عدد العملاء المحتملين
  add column if not exists roi numeric not null default 0,           -- العائد على الاستثمار %
  add column if not exists notes text not null default '';          -- ملاحظات الأدمن على الحملة
