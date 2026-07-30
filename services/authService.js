// src/services/authService.js
import { supabase } from "../lib/supabaseClient";

export async function signInAdmin(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signOutAdmin() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentSession() {
  const { data } = await supabase.auth.getSession();
  return data.session || null;
}

// بيتحقق إن اليوزر الحالي مسجل في جدول admins (مش بس عنده حساب)
export async function isCurrentUserAdmin() {
  const session = await getCurrentSession();
  if (!session) return false;

  const { data, error } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error) return false;
  return !!data;
}

// استمع لتغيّرات حالة تسجيل الدخول (يفيد في تحديث الواجهة تلقائيًا)
export function onAuthStateChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return () => data.subscription.unsubscribe();
}
