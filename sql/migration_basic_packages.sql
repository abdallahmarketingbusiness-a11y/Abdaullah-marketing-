-- migration_basic_packages.sql
-- نفّذ هذا الملف كامل في: Supabase Dashboard → SQL Editor → New Query → Run
-- (بعد ما تكون نفّذت schema.sql قبل كده، عشان محتاج دالة is_admin()
--  ودالة set_updated_at() الموجودين هناك)
--
-- الهدف: تحويل "الباقات الأساسية" اللي بتظهر في قسم الأسعار بالصفحة الرئيسية
-- (اللي كانت أرقام وأسماء ثابتة في الكود) لجدول حقيقي في قاعدة البيانات،
-- عشان تقدر من لوحة الأدمن: تضيف باقة جديدة، تعدّل أي باقة، تحذف، تغيّر
-- السعر، تغيّر المميزات، ترتّب الباقات بالسحب، وتظهر/تخفي أي باقة —
-- من غير ما تلمس كود الموقع خالص.

-- ============================================================================
-- 1) الجدول
-- ============================================================================
create table if not exists basic_packages (
  id uuid primary key default gen_random_uuid(),

  icon text not null default '📦',
  tier text not null,                 -- اسم الباقة، مثلاً "الأساسية"
  price numeric(10,2) not null default 0,
  badge text,                         -- نص شارة اختياري، مثلاً "الأكثر طلباً" (سيبها فاضية لو مفيش)
  color text not null default '#C9963A', -- لون الباقة (hex) بيتحكم في لون الحدود والتوهج بالتصميم الحالي
  features jsonb not null default '[]'::jsonb, -- مصفوفة نصوص: ["8 بوستات احترافية", "8 ستوري", ...]

  sort_order integer not null default 0,
  status text not null default 'visible' check (status in ('visible', 'hidden')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_basic_packages_status on basic_packages(status);
create index if not exists idx_basic_packages_sort on basic_packages(sort_order);

drop trigger if exists trg_basic_packages_updated_at on basic_packages;
create trigger trg_basic_packages_updated_at
  before update on basic_packages
  for each row execute function set_updated_at();

-- ============================================================================
-- 2) RLS: أي زائر يشوف الباقات الظاهرة بس، الأدمن يشوف/يتحكم في الكل
-- ============================================================================
alter table basic_packages enable row level security;

drop policy if exists basic_packages_select on basic_packages;
create policy basic_packages_select on basic_packages
  for select
  using (status <> 'hidden' or is_admin());

drop policy if exists basic_packages_insert on basic_packages;
create policy basic_packages_insert on basic_packages
  for insert
  with check (is_admin());

drop policy if exists basic_packages_update on basic_packages;
create policy basic_packages_update on basic_packages
  for update
  using (is_admin())
  with check (is_admin());

drop policy if exists basic_packages_delete on basic_packages;
create policy basic_packages_delete on basic_packages
  for delete
  using (is_admin());

-- ============================================================================
-- 3) تعبئة الجدول بنفس الباقات الأساسية الأربعة اللي كانت ثابتة في كود
--    الموقع، عشان الأسعار والمميزات المعروضة دلوقتي متتغيرش ولا تختفي.
--    (الشرط "where not exists" بيمنع تكرار الإضافة لو شغّلت الملف أكتر من مرة)
-- ============================================================================
insert into basic_packages (icon, tier, price, badge, color, features, sort_order, status)
select * from (values
  ('🥉', 'الأساسية', 1800, null, '#CD7F32',
    '["8 بوستات احترافية", "8 ستوري", "كتابة المحتوى التسويقي", "جدولة المحتوى", "تعديلين لكل تصميم"]'::jsonb,
    1, 'visible'),
  ('🥈', 'المتقدمة', 2800, null, '#C0C0C0',
    '["12 بوست احترافي", "12 ستوري", "كتابة المحتوى التسويقي", "2 فيديو ريلز احترافية بالذكاء الاصطناعي", "كتابة 2 سكربت تصوير للريلز", "تصميم العروض والخصومات", "إدارة الحملات الإعلانية الممولة (ميزانية الإعلانات على العميل)"]'::jsonb,
    2, 'visible'),
  ('🥇', 'الاحترافية', 4500, 'الأكثر طلباً', '#C9963A',
    '["16 بوست احترافي", "20 ستوري", "كتابة المحتوى التسويقي", "4 فيديوهات ريلز بالذكاء الاصطناعي", "كتابة سكربتات الريلز والإعلانات", "خطة محتوى شهرية", "إدارة وتحسين الحملات الإعلانية (ميزانية الإعلانات على العميل)", "تقرير أداء شهري"]'::jsonb,
    3, 'visible'),
  ('💎', 'الشاملة', 6500, null, '#6ee7f7',
    '["20 بوست احترافي", "30 ستوري", "كتابة المحتوى التسويقي", "8 فيديوهات ريلز بالذكاء الاصطناعي", "كتابة سكربتات الريلز والإعلانات", "خطة تسويقية شهرية", "إدارة جميع منصات التواصل الاجتماعي", "إدارة وتحسين الحملات الإعلانية (ميزانية الإعلانات على العميل)", "تقرير وتحليل أداء شهري"]'::jsonb,
    4, 'visible')
) as seed(icon, tier, price, badge, color, features, sort_order, status)
where not exists (select 1 from basic_packages);
