// src/services/clientAuthService.js
// نظام حسابات العملاء — منفصل عن authService.js (اللي بيدير دخول الأدمن فقط).
import { supabase } from "../lib/supabaseClient";
import { supabaseAdmin } from "../lib/supabaseAdminClient";

// إنشاء حساب عميل جديد. الـ metadata بتتخزن على auth.users وبيقرأها
// الـ trigger (handle_new_client في migration_clients.sql) عشان يعمل صف في جدول clients تلقائيًا.
export async function signUpClient({ email, password, fullName, phone, businessName }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName || "",
        phone: phone || "",
        business_name: businessName || "",
      },
    },
  });
  if (error) throw error;
  // data.session بيبقى null لو الإيميل محتاج تأكيد (حسب إعدادات المشروع في Supabase)
  return data;
}

export async function signInClient(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signOutClient() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentClientSession() {
  const { data } = await supabase.auth.getSession();
  return data.session || null;
}

// بيانات العميل من جدول clients (مش auth.users)
export async function getClientProfile() {
  const session = await getCurrentClientSession();
  if (!session) return null;
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("user_id", session.user.id)
    .maybeSingle();
  if (error) return null;
  return data;
}

// تحديث بيانات العميل في جدول clients (الاسم / الهاتف / اسم النشاط التجاري).
// بيستخدم في لوحة تحكم العميل (تبويب "الملف الشخصي").
export async function updateClientProfile({ fullName, phone, businessName }) {
  const session = await getCurrentClientSession();
  if (!session) throw new Error("لازم تسجّل الدخول الأول.");
  const { data, error } = await supabase
    .from("clients")
    .update({
      full_name: fullName ?? "",
      phone: phone ?? "",
      business_name: businessName ?? "",
    })
    .eq("user_id", session.user.id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

// قائمة كل العملاء — للأدمن بس (RLS: clients_select_admin في migration_analytics.sql).
// بتُستخدم في لوحة "تحليلات العملاء" عشان الأدمن يختار العميل اللي هيضيفله تقرير.
export async function fetchAllClientsForAdmin({ search = "" } = {}) {
  let query = supabaseAdmin.from("clients").select("*");
  if (search && search.trim()) {
    const term = search.trim();
    query = query.or(`full_name.ilike.%${term}%,business_name.ilike.%${term}%,phone.ilike.%${term}%`);
  }
  query = query.order("full_name", { ascending: true });
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// إرسال رابط إعادة تعيين كلمة المرور بالإيميل.
// لازم يكون #reset-password مضاف في Supabase → Authentication → URL Configuration → Redirect URLs
export async function requestPasswordReset(email) {
  const redirectTo = `${window.location.origin}${window.location.pathname}#reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

// بتتنادى بعد ما اليوزر يدوس على رابط الإيميل ويوصل لصفحة reset-password
// وسوباباز يكون فتح له session مؤقتة من نوع "recovery"
export async function updateClientPassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

// استمع لتغيّرات حالة تسجيل الدخول (بيفيد في تحديث الـ Navbar وصفحة reset-password)
export function onClientAuthStateChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
  return () => data.subscription.unsubscribe();
}
