-- patch_is_pinned.sql
-- نفّذ هذا الملف في: Supabase Dashboard → SQL Editor → New Query → Run
--
-- سبب الحاجة له: كود لوحة الأدمن (services/portfolioService.js) بيستخدم عمود
-- "is_pinned" في أكتر من مكان (ترتيب العرض، ميزة "تثبيت منشور")، لكن العمود
-- ده متكانش موجود أصلاً في migration_portfolio.sql — الأمر ده بيضيفه بأمان
-- (safe/additive، مش هيأثر على أي بيانات موجودة).

alter table portfolio_items
  add column if not exists is_pinned boolean not null default false;

create index if not exists idx_portfolio_pinned on portfolio_items(is_pinned);
