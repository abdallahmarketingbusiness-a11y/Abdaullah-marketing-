// lib/supabaseAdminClient.js
//
// Supabase client مخصص لجلسة الأدمن بس — منفصل تمامًا عن lib/supabaseClient.js
// (اللي بيستخدمه العملاء + القراءة العامة للزوار).
//
// السبب: Supabase Auth بيخزن الـ session في localStorage تحت مفتاح واحد.
// لو استخدمنا نفس الـ client للأدمن والعميل، هيبقوا فعليًا نفس الجلسة —
// يعني تسجيل دخول الأدمن هيتحسب "عميل مسجل دخول" في أي مكان تاني بالموقع،
// وتسجيل خروج أي واحد فيهم هيسجل خروج التاني كمان.
//
// بإدينا storageKey مختلف، الأدمن بيبقى ليه مفتاحه الخاص في localStorage،
// فالجلستين تعيشوا جنب بعض من غير ما يأثروا في بعض.
//
// نفس متغيرات البيئة بتاعت lib/supabaseClient.js (نفس مشروع Supabase،
// بس جلسة auth منفصلة على مستوى المتصفح فقط).

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "⚠️ Supabase (admin) غير مُهيأ: تأكد من وجود NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY في ملف .env.local"
  );
}

export const supabaseAdmin = createClient(supabaseUrl || "", supabaseAnonKey || "", {
  auth: {
    storageKey: "sb-admin-auth-token",
    persistSession: true,
    autoRefreshToken: true,
  },
});
