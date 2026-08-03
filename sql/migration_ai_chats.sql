-- migration_ai_chats.sql
-- نفّذ هذا الملف في: Supabase Dashboard → SQL Editor → New Query → Run
--
-- بيضيف نظام تخزين محادثات شات "خبير عبدالله ماركتنج" الذكي، مربوطة بحساب
-- العميل (clients)، عشان تظهر في لوحة الأدمن تحت تبويب "محادثات الذكاء الاصطناعي":
-- عميل → قائمة محادثاته → ملخص كل محادثة + إمكانية عرضها كاملة.

-- ============================================================================
-- 1) جدول المحادثات (سطر واحد لكل "جلسة شات" يفتحها العميل)
-- ============================================================================
create table if not exists ai_chat_conversations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,

  -- ملخص مختصر للمحادثة (بيتحدث تلقائيًا بعد كل رد من الذكاء الاصطناعي)
  summary text default '',

  -- آخر رسالة (لعرضها في قائمة المحادثات بسرعة من غير ما نجيب كل الرسائل)
  last_message_preview text default '',
  last_message_at timestamptz not null default now(),

  messages_count integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ai_chat_conversations_client on ai_chat_conversations(client_id);
create index if not exists idx_ai_chat_conversations_last_message on ai_chat_conversations(last_message_at desc);

drop trigger if exists trg_ai_chat_conversations_updated_at on ai_chat_conversations;
create trigger trg_ai_chat_conversations_updated_at
  before update on ai_chat_conversations
  for each row execute function set_updated_at();

-- ============================================================================
-- 2) جدول الرسائل (كل رسالة من العميل أو من الذكاء الاصطناعي)
-- ============================================================================
create table if not exists ai_chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references ai_chat_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_chat_messages_conversation on ai_chat_messages(conversation_id, created_at);

-- ============================================================================
-- 3) تفعيل Row Level Security + الصلاحيات
-- ============================================================================
alter table ai_chat_conversations enable row level security;
alter table ai_chat_messages enable row level security;

-- العميل يقدر يشوف ويعدّل بس محادثاته هو
drop policy if exists ai_chat_conversations_select_own on ai_chat_conversations;
create policy ai_chat_conversations_select_own on ai_chat_conversations
  for select
  using (auth.uid() = client_id);

drop policy if exists ai_chat_conversations_insert_own on ai_chat_conversations;
create policy ai_chat_conversations_insert_own on ai_chat_conversations
  for insert
  with check (auth.uid() = client_id);

drop policy if exists ai_chat_conversations_update_own on ai_chat_conversations;
create policy ai_chat_conversations_update_own on ai_chat_conversations
  for update
  using (auth.uid() = client_id)
  with check (auth.uid() = client_id);

-- الأدمن يقدر يشوف كل المحادثات
drop policy if exists ai_chat_conversations_select_admin on ai_chat_conversations;
create policy ai_chat_conversations_select_admin on ai_chat_conversations
  for select
  using (is_admin());

-- رسائل الشات: العميل يقدر يقرأ/يضيف بس في محادثاته هو
drop policy if exists ai_chat_messages_select_own on ai_chat_messages;
create policy ai_chat_messages_select_own on ai_chat_messages
  for select
  using (
    exists (
      select 1 from ai_chat_conversations c
      where c.id = ai_chat_messages.conversation_id and c.client_id = auth.uid()
    )
  );

drop policy if exists ai_chat_messages_insert_own on ai_chat_messages;
create policy ai_chat_messages_insert_own on ai_chat_messages
  for insert
  with check (
    exists (
      select 1 from ai_chat_conversations c
      where c.id = ai_chat_messages.conversation_id and c.client_id = auth.uid()
    )
  );

-- الأدمن يقدر يقرأ كل الرسائل
drop policy if exists ai_chat_messages_select_admin on ai_chat_messages;
create policy ai_chat_messages_select_admin on ai_chat_messages
  for select
  using (is_admin());

-- ملاحظة: كل عمليات الأدمن (قراءة قائمة العملاء + محادثاتهم) بتتم فعليًا عن
-- طريق service_role من مسارات app/api/admin/ai-chats/** (زي باقي أقسام الأدمن)،
-- فسياسات is_admin() هنا شبكة أمان إضافية بس مش الاعتماد الأساسي.
