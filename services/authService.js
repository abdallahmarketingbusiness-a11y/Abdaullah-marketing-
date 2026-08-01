// src/services/authService.js
// نظام دخول الأدمن — بيستخدم جلسة Supabase منفصلة تمامًا عن جلسة العملاء
// (lib/supabaseAdminClient.js)، عشان تسجيل دخول الأدمن ميتحسبش تسجيل دخول عميل
// في أي مكان تاني بالموقع، والعكس.
import { supabaseAdmin } from "../lib/supabaseAdminClient";

export async function signInAdmin(email, password) {
  const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signOutAdmin() {
  const { error } = await supabaseAdmin.auth.signOut();
  if (error) throw error;
}

export async function getCurrentSession() {
  const { data } = await supabaseAdmin.auth.getSession();
  return data.session || null;
}

// بيتحقق إن اليوزر الحالي مسجل في جدول admins (مش بس عنده حساب)
export async function isCurrentUserAdmin() {
  const session = await getCurrentSession();
  if (!session) return false;

  const { data, error } = await supabaseAdmin
    .from("admins")
    .select("user_id")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error) return false;
  return !!data;
}

// استمع لتغيّرات حالة تسجيل الدخول (يفيد في تحديث الواجهة تلقائيًا)
export function onAuthStateChange(callback) {
  const { data } = supabaseAdmin.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return () => data.subscription.unsubscribe();
}
