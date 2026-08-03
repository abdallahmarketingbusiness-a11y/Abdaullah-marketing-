-- migration_ai_client_memory.sql
-- نفّذ هذا الملف في: Supabase Dashboard → SQL Editor → New Query → Run
-- (بعد migration_ai_chats.sql)
--
-- بيضيف جدول "ذاكرة العميل" الدائمة لشات "خبير عبدالله ماركتنج": حقائق
-- مستقلة عن أي محادثة بعينها بيتراكموا مع الوقت (نوع نشاط العميل، أهدافه،
-- تفضيلاته، تفاصيل مشروعه...) عشان المساعد الذكي "يفتكر" العميل حتى لو فتح
-- محادثة جديدة تمامًا، بدل ما يبدأ من الصفر كل مرة.

create table if not exists ai_client_memory (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,

  -- نص حر يجمع كل الحقائق المهمة اللي اتجمعت عن العميل من كل محادثاته
  -- (بيتحدّث/يتكمل تلقائي بعد كل محادثة، مش بيتصفّر)
  memory_text text not null default '',

  updated_at timestamptz not null default now()
);

-- عميل واحد = سطر ذاكرة واحد بس
create unique index if not exists idx_ai_client_memory_client on ai_client_memory(client_id);

drop trigger if exists trg_ai_client_memory_updated_at on ai_client_memory;
create trigger trg_ai_client_memory_updated_at
  before update on ai_client_memory
  for each row execute function set_updated_at();

alter table ai_client_memory enable row level security;

-- العميل يقدر يشوف بس ذاكرته هو (مفيش insert/update مباشر من الفرونت —
-- ده بيتم بس عن طريق service_role من app/api/chat عشان النص يتراجع ويتحرر
-- بمنطق محدد، مش أي كتابة حرة من المتصفح)
drop policy if exists ai_client_memory_select_own on ai_client_memory;
create policy ai_client_memory_select_own on ai_client_memory
  for select
  using (auth.uid() = client_id);

-- الأدمن يقدر يشوف ذاكرة أي عميل (مفيد لو حابب يراجع إيه اللي المساعد
-- الذكي "فاهمه" عن عميل معين)
drop policy if exists ai_client_memory_select_admin on ai_client_memory;
create policy ai_client_memory_select_admin on ai_client_memory
  for select
  using (is_admin());
