-- migration_subscriptions.sql
-- نفّذ هذا الملف في: Supabase Dashboard → SQL Editor → New Query → Run
-- (بعد schema.sql و migration_clients.sql، لأنه بيعتمد على is_admin() وجدول clients و packages)
--
-- ده بيضيف:
--   1) coupons              → أكواد خصم (تفعيل/تعطيل من لوحة السوبر أدمن)
--   2) package_subscriptions → طلبات اشتراك العملاء في الباقات (Pending/Active/Expired/Cancelled)
--
-- الفكرة: العميل يختار باقة من "الباقات المخصصة" ويدوس "اشترك الآن":
--   - لو مش مسجل دخول → يعمل حساب الأول (نظام clients الموجود).
--   - يقدر يحط كود خصم (اختياري).
--   - بيتعمل طلب اشتراك بحالة "pending" ويتفتح واتساب تلقائيًا ببيانات الباقة.
--   - الاشتراك ميتفعّلش (status = active + تاريخ بداية/نهاية) إلا لما السوبر أدمن يوافق
--     من لوحة تحكم الأدمن (تبويب "الاشتراكات").

-- ============================================================================
-- 1) جدول أكواد الخصم — coupons
-- ============================================================================
create table if not exists coupons (
  id uuid primary key default gen_random_uuid(),

  code text not null unique,
  discount_type text not null default 'percent' check (discount_type in ('percent', 'fixed')),
  discount_value numeric(10,2) not null default 0,

  max_uses integer, -- NULL = بدون حد أقصى
  used_count integer not null default 0,

  -- تفعيل/تعطيل الكوبون من السوبر أدمن (زي ما طلبت: "أتحكم فيهم من السوبر أدمن من تفعيل")
  is_active boolean not null default true,
  expires_at date, -- NULL = بدون تاريخ انتهاء

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_coupons_code on coupons(code);

drop trigger if exists trg_coupons_updated_at on coupons;
create trigger trg_coupons_updated_at
  before update on coupons
  for each row execute function set_updated_at();

alter table coupons enable row level security;

-- القراءة: أي مستخدم مسجّل يقدر يشوف الكوبونات "الفعّالة" بس (عشان التحقق منها)، الأدمن يشوف الكل
drop policy if exists coupons_select on coupons;
create policy coupons_select on coupons
  for select
  using (is_admin() or (is_active = true and (expires_at is null or expires_at >= current_date)));

-- الإنشاء/التعديل/الحذف: الأدمن فقط
drop policy if exists coupons_insert on coupons;
create policy coupons_insert on coupons
  for insert
  with check (is_admin());

drop policy if exists coupons_update on coupons;
create policy coupons_update on coupons
  for update
  using (is_admin())
  with check (is_admin());

drop policy if exists coupons_delete on coupons;
create policy coupons_delete on coupons
  for delete
  using (is_admin());

-- دالة "استخدام" الكوبون بشكل آمن (تتحقق من صلاحيته وتزوّد used_count بخطوة واحدة أتومية)
-- بتشتغل بصلاحيات الأدمن (security definer) عشان تقدر تعدّل used_count حتى لو المستخدم مش أدمن،
-- لكنها بترفض أي كوبون مش فعّال/منتهي/خلّص عدد استخداماته.
create or replace function redeem_coupon(p_code text)
returns coupons
language plpgsql
security definer
set search_path = public
as $$
declare
  c coupons;
begin
  select * into c from coupons
  where upper(code) = upper(p_code)
    and is_active = true
    and (expires_at is null or expires_at >= current_date)
    and (max_uses is null or used_count < max_uses)
  for update;

  if not found then
    return null;
  end if;

  update coupons set used_count = used_count + 1 where id = c.id returning * into c;
  return c;
end;
$$;

grant execute on function redeem_coupon(text) to authenticated;

-- ============================================================================
-- 2) جدول طلبات الاشتراك — package_subscriptions
-- ============================================================================
create table if not exists package_subscriptions (
  id uuid primary key default gen_random_uuid(),

  client_id uuid not null references clients(user_id) on delete cascade,
  package_id uuid references packages(id) on delete set null,

  -- نسخة من بيانات الباقة وقت الاشتراك (عشان لو الباقة اتعدّلت/اتحذفت بعدين، الطلب يفضل واضح)
  package_name text not null default '',
  business_name text not null default '',
  base_price numeric(10,2) not null default 0,

  coupon_code text,
  discount_amount numeric(10,2) not null default 0,
  final_price numeric(10,2) not null default 0,

  status text not null default 'pending' check (status in ('pending', 'active', 'expired', 'cancelled')),

  is_renewal boolean not null default false,
  previous_subscription_id uuid references package_subscriptions(id) on delete set null,

  duration_days integer not null default 30,
  start_date date,
  end_date date,

  admin_note text not null default '',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pkg_subs_client on package_subscriptions(client_id, created_at desc);
create index if not exists idx_pkg_subs_status on package_subscriptions(status);

drop trigger if exists trg_pkg_subs_updated_at on package_subscriptions;
create trigger trg_pkg_subs_updated_at
  before update on package_subscriptions
  for each row execute function set_updated_at();

alter table package_subscriptions enable row level security;

-- القراءة: العميل يشوف اشتراكاته هو بس، الأدمن يشوف الكل
drop policy if exists pkg_subs_select on package_subscriptions;
create policy pkg_subs_select on package_subscriptions
  for select
  using (is_admin() or client_id = auth.uid());

-- الإنشاء: العميل يقدر يبعت طلب اشتراك جديد لنفسه بس، ولازم يكون Pending
-- (التفعيل بيتم بعدين من الأدمن فقط عن طريق UPDATE)
drop policy if exists pkg_subs_insert on package_subscriptions;
create policy pkg_subs_insert on package_subscriptions
  for insert
  with check (is_admin() or (client_id = auth.uid() and status = 'pending'));

-- التعديل: الأدمن فقط (تفعيل/إلغاء/تحديث تواريخ...) — العميل ميقدرش يفعّل اشتراكه بنفسه
drop policy if exists pkg_subs_update on package_subscriptions;
create policy pkg_subs_update on package_subscriptions
  for update
  using (is_admin())
  with check (is_admin());

-- الحذف: الأدمن فقط
drop policy if exists pkg_subs_delete on package_subscriptions;
create policy pkg_subs_delete on package_subscriptions
  for delete
  using (is_admin());

-- ============================================================================
-- 3) ملاحظة: تحديث الاشتراكات المنتهية (status = active لكن end_date فات)
-- ============================================================================
-- ده مش بيحصل أوتوماتيك (المشروع مفيهوش pg_cron)، فبيتم دوريًا من زر
-- "تحديث الاشتراكات المنتهية" في لوحة السوبر أدمن (تبويب "الاشتراكات")، اللي بينفّذ:
--
--   update package_subscriptions
--   set status = 'expired'
--   where status = 'active' and end_date is not null and end_date < current_date;
--
-- الزرار ده موجود في components/SubscriptionsManager.jsx (دالة expireOverdueSubscriptions
-- في services/subscriptionAdminService.js).
