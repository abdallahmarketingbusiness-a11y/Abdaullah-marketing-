-- migration_clients.sql
-- نفّذ هذا الملف في: Supabase Dashboard → SQL Editor → New Query → Run
-- (زي ما اتعمل مع schema.sql و migration_portfolio.sql)
--
-- ده بيضيف نظام حسابات العملاء (منفصل تمامًا عن جدول admins الموجود).
-- أي مستخدم يعمل Sign Up من الموقع = "عميل"، مش أدمن، إلا لو اتضاف يدويًا لجدول admins.

-- ============================================================================
-- 1) جدول العملاء (بيانات إضافية مرتبطة بحساب auth.users)
-- ============================================================================
create table if not exists clients (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text default '',
  business_name text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table clients enable row level security;

-- كل عميل يقدر يشوف/يعدّل بياناته هو بس
drop policy if exists clients_select_own on clients;
create policy clients_select_own on clients
  for select
  using (auth.uid() = user_id);

drop policy if exists clients_update_own on clients;
create policy clients_update_own on clients
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ملاحظة: مفيش policy للـ insert من جهة الـ client، لأن إنشاء الصف بيتم تلقائيًا
-- عن طريق الـ trigger تحت (security definer، بيتخطى RLS). ده بيحل مشكلة إن
-- Supabase أحيانًا بيرجّع session فاضي وقت الـ signup لحد ما العميل يفعّل إيميله.

create or replace function set_updated_at_clients()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_clients_updated_at on clients;
create trigger trg_clients_updated_at
  before update on clients
  for each row execute function set_updated_at_clients();

-- ============================================================================
-- 2) إنشاء تلقائي لصف "clients" مع أي حساب جديد في auth.users
-- ============================================================================
-- بيقرأ full_name / phone / business_name من الـ metadata اللي بنبعتها وقت signUp()
-- تنبيه: ده هيشتغل مع أي حساب جديد بما فيهم لو اتعمل حساب أدمن جديد لاحقًا —
-- هيكون له صف في clients كمان، وده مش مشكلة (صلاحية الأدمن بتتحدد من جدول admins فقط).
create or replace function handle_new_client()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.clients (user_id, full_name, phone, business_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'business_name', '')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_new_client on auth.users;
create trigger trg_new_client
  after insert on auth.users
  for each row execute function handle_new_client();

-- ============================================================================
-- 3) إعداد لازم تعمله يدويًا في Supabase (مش SQL):
-- ============================================================================
-- Authentication → URL Configuration → Redirect URLs: ضيف رابط موقعك + #reset-password
--   مثال: https://your-domain.com/#reset-password
-- من غير الخطوة دي، رابط "نسيت كلمة المرور" اللي بيتبعت بالإيميل مش هيشتغل صح.
