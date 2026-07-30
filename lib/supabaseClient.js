// lib/supabaseClient.js
//
// نقطة اتصال واحدة بـ Supabase لكل المشروع (Next.js).
// كل الملفات الأخرى (packagesService, authService) تستورد من هنا فقط.
//
// المتغيرات لازم تتحط في ملف .env.local في جذر المشروع:
//   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
//   NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxx
//
// البادئة NEXT_PUBLIC_ ضرورية عشان Next.js يسمح بقراءة القيمة دي من كود
// الـ Client Component (المتصفح) — أي متغير من غير البادئة دي بيفضل سيرفر بس.

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // مش هيوقف التطبيق، بس هيوضح المشكلة في الـ console بدل ما يفشل بصمت
  console.warn(
    "⚠️ Supabase غير مُهيأ: تأكد من وجود NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY في ملف .env.local"
  );
}

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "");
