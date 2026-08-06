-- patch_client_reviews_self_submit.sql
-- نفّذ هذا الملف في: Supabase Dashboard → SQL Editor → New Query → Run
-- (بعد ما تكون نفّذت migration_client_reviews.sql و migration_clients.sql قبل كده)
--
-- السبب: العملاء اللي عندهم حساب (Client Login) يقدروا يضيفوا تقييم بنفسهم من
-- لوحة العميل، بدل ما يكون الإضافة من لوحة السوبر أدمن بس. أي تقييم بيضيفه
-- عميل بيتحفظ بحالة "hidden" (قيد المراجعة) تلقائيًا ومش بيظهر للعامة إلا لما
-- الأدمن يوافق عليه ويظهره — نفس منطق المراجعة المستخدم في باقي المحتوى.

-- عمود بيربط التقييم بحساب العميل اللي كتبه (يفضل فاضي لو الأدمن هو اللي أضافه يدويًا)
alter table client_reviews add column if not exists client_user_id uuid references auth.users(id) on delete set null;

create index if not exists idx_client_reviews_user on client_reviews(client_user_id);

-- العميل يقدر يشوف تقييماته هو (حتى لو لسه قيد المراجعة) بالإضافة للتقييمات الظاهرة للعامة
drop policy if exists client_reviews_select on client_reviews;
create policy client_reviews_select on client_reviews
  for select
  using (status = 'visible' or is_admin() or auth.uid() = client_user_id);

-- العميل يقدر يضيف تقييم لنفسه بس، وبيتحفظ إجباريًا بحالة "قيد المراجعة" (hidden)
-- لحد ما الأدمن يوافق عليه من لوحة التحكم
drop policy if exists client_reviews_insert_own on client_reviews;
create policy client_reviews_insert_own on client_reviews
  for insert
  with check (
    auth.uid() = client_user_id
    and status = 'hidden'
  );
