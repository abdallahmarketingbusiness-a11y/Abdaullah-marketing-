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
//
// ⚠️ لو بتنشر على Vercel: لازم تضيف نفس المتغير في Project Settings →
// Environment Variables هناك برضه — .env.local مبيتنشرش مع المشروع.
//
// ملحوظة تقنية: التهيئة هنا "كسولة" (lazy) — يعني createClient() بينفّذ بس
// أول مرة حد يستدعي getSupabaseService() جوه route handler وقت الطلب
// الفعلي، مش وقت الـ build. لو عملناها عادي (top-level) وقت الـ build على
// Vercel هيحاول "يجمع بيانات الصفحة" لكل مسار API، وده بيشغّل الكود من غير
// المتغيرات دي لسه موجودة، فيقع الـ build بالكامل حتى لو المسار ده معمول
// عليه استخدام فعلي وقت التشغيل بس.

import { createClient } from "@supabase/supabase-js";

let cachedClient = null;

export function getSupabaseService() {
  if (cachedClient) return cachedClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "إعدادات السيرفر ناقصة: تأكد من إضافة NEXT_PUBLIC_SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY " +
      "في متغيرات البيئة (Vercel → Project Settings → Environment Variables، أو .env.local محليًا)."
    );
  }

  cachedClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}
