-- schema.sql
-- نفّذ هذا الملف كامل في: Supabase Dashboard → SQL Editor → New Query → Run

-- ============================================================================
-- 1) جدول الأدمن (سطر واحد بس، بيربط حساب auth.users بصلاحية الأدمن)
-- ============================================================================
create table if not exists admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- دالة مساعدة: هل اليوزر الحالي أدمن؟
create or replace function is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

-- ============================================================================
-- 2) جدول الباقات
-- ============================================================================
create table if not exists packages (
  id uuid primary key default gen_random_uuid(),

  business_name text not null,
  business_type text not null,
  package_name text not null,

  base_package_id text,
  base_package_tier text,

  posts_count integer default 0,
  stories_count integer default 0,
  reels_count integer default 0,
  scripts_count integer default 0,

  -- كل حالة "خصص باقتك" (المواقع، المنصات، الهوية، الإعلانات، الخ) بشكلها الخام
  -- عشان "استخدام هذه الباقة" يقدر يرجّع نفس الاختيارات بالظبط بدون أي فقدان بيانات
  builder_state jsonb default '{}'::jsonb,

  base_price numeric(10,2) default 0,
  extras_price numeric(10,2) default 0,
  final_price numeric(10,2) default 0,

  client_notes text default '',

  status text not null default 'visible' check (status in ('visible', 'hidden', 'featured')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_packages_status on packages(status);
create index if not exists idx_packages_business_type on packages(business_type);
create index if not exists idx_packages_created_at on packages(created_at desc);

-- تحديث updated_at تلقائيًا مع أي UPDATE
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_packages_updated_at on packages;
create trigger trg_packages_updated_at
  before update on packages
  for each row execute function set_updated_at();

-- ============================================================================
-- 3) تفعيل Row Level Security + الصلاحيات
-- ============================================================================
alter table packages enable row level security;
alter table admins enable row level security;

-- القراءة: أي حد يقدر يشوف الباقات الظاهرة أو المميزة، الأدمن يشوف الكل (بما فيها المخفية)
drop policy if exists packages_select on packages;
create policy packages_select on packages
  for select
  using (status <> 'hidden' or is_admin());

-- الإنشاء: أي زائر يقدر يعمل باقة جديدة، لكن لازم تتحفظ Visible فقط (مش Hidden/Featured)
-- إلا لو هو أدمن
drop policy if exists packages_insert on packages;
create policy packages_insert on packages
  for insert
  with check (is_admin() or status = 'visible');

-- التعديل: الأدمن فقط
drop policy if exists packages_update on packages;
create policy packages_update on packages
  for update
  using (is_admin())
  with check (is_admin());

-- الحذف: الأدمن فقط
drop policy if exists packages_delete on packages;
create policy packages_delete on packages
  for delete
  using (is_admin());

-- جدول admins: محدش يقرا فيه غير نفسه (اختياري، مش حرج لأن الجدول مفيهوش بيانات حساسة)
drop policy if exists admins_select_self on admins;
create policy admins_select_self on admins
  for select
  using (auth.uid() = user_id);

-- ============================================================================
-- 4) خطوات لازم تعملها يدويًا بعد تشغيل السكريبت ده:
-- ============================================================================
-- أ) روح لـ Authentication → Users → Add User، واعمل حساب الأدمن (إيميل + باسورد).
-- ب) خد الـ UUID بتاع اليوزر ده من نفس الصفحة، ونفّذ السطر ده (غيّر القيمة):
--
--    insert into admins (user_id) values ('ضع-هنا-uuid-حساب-الأدمن');
--
-- كده أي حساب تاني هيتعامل معاه كـ Visitor تلقائيًا، وحساب الأدمن بس هو اللي هيقدر
-- يعدل/يحذف/يثبّت/يخفي الباقات (الصلاحيات دي مفروضة من قاعدة البيانات نفسها،
-- مش بس من إخفاء الأزرار في الواجهة).
