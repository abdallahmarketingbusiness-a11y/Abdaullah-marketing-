-- migration_client_portal.sql
-- نفّذ هذا الملف في: Supabase Dashboard → SQL Editor → New Query → Run
-- (بعد schema.sql و migration_clients.sql و migration_analytics.sql)
--
-- ده بيحوّل كل أقسام "لوحة تحكم العميل" اللي كانت بتعرض بيانات وهمية (Sample
-- Data) لأنظمة حقيقية: الأدمن يضيف/يعدّل/يحذف من لوحة السوبر أدمن (تبويب
-- "بيانات لوحة العميل")، والعميل يشوف بس اللي "منشور" (is_published = true)
-- في لوحة تحكمه. نفس فكرة is_admin() / client_analytics بالظبط.
--
-- الأقسام اللي بيضيفها الملف ده:
--   1) client_subscriptions  → قسم "الرئيسية" (حالة الاشتراك)
--   2) performance_kpis      → قسم "الأداء"
--   3) campaigns             → قسم "الحملات الإعلانية" (وكمان بيغذّي "آخر حملة" بالرئيسية)
--   4) reports               → قسم "التقارير" (وكمان "آخر تقرير" بالرئيسية)
--   5) client_files          → قسم "الملفات"
--   6) content_scripts       → قسم "السكربتات"
--   7) client_notes          → قسم "الملاحظات" (وكمان "آخر تحديث" بالرئيسية)
--   8) invoices              → قسم "الفواتير"
--   9) notifications         → قسم "الإشعارات"
--
-- ملحوظة: "آخر منشور" في الرئيسية بيتغذّى من أفضل منشور في آخر تقرير تحليلات
-- (client_analytics.best_posts) — مفيش داعي لجدول تاني، البيانات موجودة أصلًا.

-- ============================================================================
-- دالة عامة تساعد كل الجداول تحت تتفلتر بسهولة: هل الصف ده "منشور" ويظهر للعميل؟
-- ============================================================================
-- (مفيش داعي لدالة، بنستخدم عمود is_published مباشرة في كل policy)

-- ============================================================================
-- 1) حالة الاشتراك — client_subscriptions
-- ============================================================================
create table if not exists client_subscriptions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(user_id) on delete cascade,

  plan_name text not null default '',
  status text not null default 'نشط',
  renews_at date,

  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_client_subscriptions_client on client_subscriptions(client_id, created_at desc);

-- ============================================================================
-- 2) مؤشرات الأداء — performance_kpis
-- ============================================================================
create table if not exists performance_kpis (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(user_id) on delete cascade,

  label text not null default '',
  value numeric not null default 0,
  target numeric not null default 100,
  unit text not null default '%',
  sort_order integer not null default 0,

  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_performance_kpis_client on performance_kpis(client_id, sort_order);

-- ============================================================================
-- 3) الحملات الإعلانية — campaigns
-- ============================================================================
create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(user_id) on delete cascade,

  name text not null default '',
  platform text not null default '',
  status text not null default 'نشطة', -- نشطة / متوقفة مؤقتًا / منتهية
  budget numeric not null default 0,
  spend numeric not null default 0,
  reach numeric not null default 0,

  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_campaigns_client on campaigns(client_id, created_at desc);

-- ============================================================================
-- 4) التقارير — reports
-- ============================================================================
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(user_id) on delete cascade,

  title text not null default '',
  report_date date not null default now()::date,
  summary text not null default '',

  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_reports_client on reports(client_id, report_date desc);

-- ============================================================================
-- 5) الملفات — client_files
-- ============================================================================
create table if not exists client_files (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(user_id) on delete cascade,

  name text not null default '',
  file_type text not null default 'default', -- pdf / video / image / sheet / default
  size_label text not null default '',
  file_url text not null default '',
  file_date date not null default now()::date,

  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_client_files_client on client_files(client_id, created_at desc);

-- ============================================================================
-- 6) السكربتات — content_scripts
-- ============================================================================
create table if not exists content_scripts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(user_id) on delete cascade,

  title text not null default '',
  platform text not null default '',
  status text not null default 'مسودة', -- مسودة / قيد المراجعة / معتمد
  excerpt text not null default '',

  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_content_scripts_client on content_scripts(client_id, created_at desc);

-- ============================================================================
-- 7) الملاحظات — client_notes
-- ============================================================================
create table if not exists client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(user_id) on delete cascade,

  author text not null default 'فريق أبو الله ماركتينج',
  note_date date not null default now()::date,
  text_content text not null default '',

  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_client_notes_client on client_notes(client_id, note_date desc);

-- ============================================================================
-- 8) الفواتير — invoices
-- ============================================================================
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(user_id) on delete cascade,

  invoice_number text not null default '',
  invoice_date date not null default now()::date,
  amount numeric not null default 0,
  status text not null default 'مستحقة', -- مستحقة / مدفوعة / متأخرة

  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_invoices_client on invoices(client_id, invoice_date desc);

-- ============================================================================
-- 9) الإشعارات — notifications
-- ============================================================================
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(user_id) on delete cascade,

  title text not null default '',
  notif_date date not null default now()::date,
  notif_type text not null default 'default', -- invoice / report / script / campaign / default
  is_read boolean not null default false,

  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_notifications_client on notifications(client_id, created_at desc);

-- ============================================================================
-- تريجرز updated_at (بتستخدم دالة set_updated_at() الموجودة أصلًا من schema.sql)
-- ============================================================================
do $$
declare
  t text;
begin
  foreach t in array array[
    'client_subscriptions', 'performance_kpis', 'campaigns', 'reports',
    'client_files', 'content_scripts', 'client_notes', 'invoices', 'notifications'
  ]
  loop
    execute format('drop trigger if exists trg_%s_updated_at on %I;', t, t);
    execute format(
      'create trigger trg_%s_updated_at before update on %I for each row execute function set_updated_at();',
      t, t
    );
  end loop;
end $$;

-- ============================================================================
-- RLS: نفس نمط client_analytics بالظبط لكل جدول
-- (العميل يشوف بتاعه المنشور بس، الأدمن يشوف/يضيف/يعدّل/يحذف كل حاجة)
-- ============================================================================
do $$
declare
  t text;
begin
  foreach t in array array[
    'client_subscriptions', 'performance_kpis', 'campaigns', 'reports',
    'client_files', 'content_scripts', 'client_notes', 'invoices', 'notifications'
  ]
  loop
    execute format('alter table %I enable row level security;', t);

    execute format('drop policy if exists %s_select on %I;', t, t);
    execute format(
      'create policy %s_select on %I for select using (is_admin() or (auth.uid() = client_id and is_published = true));',
      t, t
    );

    execute format('drop policy if exists %s_insert on %I;', t, t);
    execute format('create policy %s_insert on %I for insert with check (is_admin());', t, t);

    execute format('drop policy if exists %s_update on %I;', t, t);
    execute format('create policy %s_update on %I for update using (is_admin()) with check (is_admin());', t, t);

    execute format('drop policy if exists %s_delete on %I;', t, t);
    execute format('create policy %s_delete on %I for delete using (is_admin());', t, t);
  end loop;
end $$;
