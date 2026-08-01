// lib/supabaseServiceClient.js
//
// ⚠️ تحذير مهم جدًا: الملف ده بيستخدم SUPABASE_SERVICE_ROLE_KEY، وهو مفتاح
// بيتخطى كل RLS policies بالكامل (صلاحية كاملة على قاعدة البيانات).
//
// - ممنوع منعًا باتًا استيراد الملف ده في أي مكون فيه "use client" (Client
//   Component) أو أي كود بيشتغل في المتصفح — المفتاح ده متغير بيئة من غير
//   بادئة NEXT_PUBLIC_، يعني Next.js بيخليه سيرفر بس، لكن لازم الانتباه إن
//   محدش يستورد الملف ده غير جوه app/api/**/route.js (Route Handlers، بتشتغل
//   على السيرفر فقط ومش بتتبعت للمتصفح).
// - كل مسارات app/api/admin/** لازم تتحقق إن الطالب أدمن فعلاً (شوف
//   lib/adminApiAuth.js) قبل ما تستخدم الـ client ده في أي عملية.
//
// المتغير ده لازم يتحط في .env.local (سيرفر بس، من غير NEXT_PUBLIC_):
//   SUPABASE_SERVICE_ROLE_KEY=eyJ...
// تلاقي القيمة في: Supabase Dashboard → Project Settings → API → service_role key

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.warn(
    "⚠️ Supabase (service role) غير مُهيأ: تأكد من وجود SUPABASE_SERVICE_ROLE_KEY في ملف .env.local (بدون بادئة NEXT_PUBLIC_)."
  );
}

export const supabaseService = createClient(supabaseUrl || "", serviceRoleKey || "", {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
