// src/services/basicPackagesService.js
//
// الباقات الأساسية اللي بتظهر في قسم "الأسعار" بالصفحة الرئيسية.
// نفس نمط services/testimonialsService.js: دوال قراءة عامة للزوار + دوال
// إدارة كاملة للأدمن (CRUD + ترتيب + إظهار/إخفاء) عن طريق جدول basic_packages.

import { supabase } from "../lib/supabaseClient";
import { supabaseAdmin } from "../lib/supabaseAdminClient";
import { logActivity } from "./activityLogService";

const TABLE = "basic_packages";

// ---- عام (الصفحة الرئيسية) -------------------------------------------------
export async function fetchVisibleBasicPackages() {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("status", "visible")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data || [];
}

// ---- أدمن -------------------------------------------------------------------
export async function fetchAllBasicPackagesForAdmin() {
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createBasicPackage(payload) {
  const { data, error } = await supabaseAdmin.from(TABLE).insert([payload]).select().single();
  if (error) throw error;
  await logActivity({ action: "create", entityType: "basic_packages", entityId: data.id, details: { tier: data.tier } });
  return data;
}

export async function updateBasicPackage(id, payload) {
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  await logActivity({ action: "update", entityType: "basic_packages", entityId: id });
  return data;
}

export async function setBasicPackageStatus(id, status) {
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBasicPackage(id) {
  const { error } = await supabaseAdmin.from(TABLE).delete().eq("id", id);
  if (error) throw error;
  await logActivity({ action: "delete", entityType: "basic_packages", entityId: id });
  return true;
}

// بتاخد مصفوفة [{id, sort_order}] بعد إعادة الترتيب بالسحب
export async function reorderBasicPackages(orderedList) {
  const updates = orderedList.map(({ id, sort_order }) =>
    supabaseAdmin.from(TABLE).update({ sort_order }).eq("id", id)
  );
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed) throw failed.error;
  return true;
}
