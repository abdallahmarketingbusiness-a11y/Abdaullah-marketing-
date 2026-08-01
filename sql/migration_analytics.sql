-- migration_analytics.sql
-- نفّذ هذا الملف في: Supabase Dashboard → SQL Editor → New Query → Run
-- (زي ما اتعمل مع schema.sql و migration_clients.sql)
--
-- ده بيضيف نظام "تحليلات العملاء": الأدمن يضيف/يعدّل تقرير تحليلات شهري لكل
-- عميل من لوحة السوبر أدمن، والعميل يشوفه برسوم بيانية في لوحة تحكمه.
-- كل صف = تقرير شهر واحد لعميل واحد (عشان نقدر نرسم "الأداء عبر الوقت").

-- ============================================================================
-- 1) جدول التحليلات
-- ============================================================================
create table if not exists client_analytics (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(user_id) on delete cascade,

  -- الشهر/الفترة اللي بيتكلم عنها التقرير
  period_month date not null default date_trunc('month', now())::date,
  period_label text not null default '',

  -- الأرقام الأساسية (تتعرض كـ KPI cards + خط زمني)
  reach integer not null default 0,               -- الوصول
  impressions integer not null default 0,          -- مرات الظهور
  engagement_rate numeric(5,2) not null default 0, -- نسبة التفاعل %
  profile_visits integer not null default 0,       -- زيارات الحساب
  followers_count integer not null default 0,      -- إجمالي المتابعين
  followers_growth integer not null default 0,     -- صافي نمو المتابعين هذا الشهر

  -- محتوى نصي/قوائم (JSON) يتعرض كبطاقات
  best_posts jsonb not null default '[]'::jsonb,     -- [{title, platform, metric}]
  worst_posts jsonb not null default '[]'::jsonb,     -- [{title, platform, metric}]
  strengths jsonb not null default '[]'::jsonb,       -- ["نقطة قوة 1", ...]
  weaknesses jsonb not null default '[]'::jsonb,      -- ["نقطة ضعف 1", ...]
  suggestions jsonb not null default '[]'::jsonb,     -- ["اقتراح للشهر القادم", ...]

  -- draft: الأدمن لسه بيحضّره ومش ظاهر للعميل. published: ظاهر في لوحة العميل.
  status text not null default 'published' check (status in ('published', 'draft')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (client_id, period_month)
);

create index if not exists idx_client_analytics_client on client_analytics(client_id);
create index if not exists idx_client_analytics_period on client_analytics(client_id, period_month desc);

drop trigger if exists trg_client_analytics_updated_at on client_analytics;
create trigger trg_client_analytics_updated_at
  before update on client_analytics
  for each row execute function set_updated_at();

-- ============================================================================
-- 2) تفعيل RLS + الصلاحيات
-- ============================================================================
alter table client_analytics enable row level security;

-- العميل يشوف تقاريره المنشورة بس، الأدمن يشوف كل حاجة (بما فيها المسودات)
drop policy if exists client_analytics_select on client_analytics;
create policy client_analytics_select on client_analytics
  for select
  using (
    is_admin()
    or (auth.uid() = client_id and status = 'published')
  );

-- الإضافة/التعديل/الحذف: الأدمن فقط
drop policy if exists client_analytics_insert on client_analytics;
create policy client_analytics_insert on client_analytics
  for insert
  with check (is_admin());

drop policy if exists client_analytics_update on client_analytics;
create policy client_analytics_update on client_analytics
  for update
  using (is_admin())
  with check (is_admin());

drop policy if exists client_analytics_delete on client_analytics;
create policy client_analytics_delete on client_analytics
  for delete
  using (is_admin());

-- ============================================================================
-- 3) الأدمن محتاج يشوف جدول "clients" كامل عشان يقدر يختار عميل من قائمة
-- ============================================================================
-- migration_clients.sql عمل policy وحيدة بس (كل عميل يشوف نفسه). الأمر ده
-- بيضيف policy تانية (permissive، بتتجمع بـ OR مع اللي قبلها) تسمح للأدمن
-- يشوف كل صفوف clients، من غير ما يمسّ الـ policy الأصلية.
drop policy if exists clients_select_admin on clients;
create policy clients_select_admin on clients
  for select
  using (is_admin());
