// src/services/packagesService.js
import { supabase } from "../lib/supabaseClient";
import { PACKAGES_TABLE, GALLERY, PACKAGE_STATUS } from "../config/packagesConfig";
import { validatePackagePayload } from "./validation";

// ---------------------------------------------------------------------------
// جلب الباقات (للجاليري) - بحث + فلاتر + ترتيب + pagination
// visitor يشوف بس visible/featured (الـ RLS بيفرض ده أصلاً حتى لو الكود اتغيّر)
// ---------------------------------------------------------------------------
export async function fetchPackages({
  search = "",
  businessType = "all",
  sort = "newest",
  page = 1,
} = {}) {
  const pageSize = GALLERY.pageSize;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase.from(PACKAGES_TABLE).select("*", { count: "exact" });

  if (search && search.trim()) {
    const term = search.trim();
    query = query.or(
      `business_name.ilike.%${term}%,package_name.ilike.%${term}%,business_type.ilike.%${term}%`
    );
  }

  if (businessType && businessType !== "all") {
    query = query.eq("business_type", businessType);
  }

  switch (sort) {
    case "oldest":
      query = query.order("created_at", { ascending: true });
      break;
    case "price_desc":
      query = query.order("final_price", { ascending: false });
      break;
    case "price_asc":
      query = query.order("final_price", { ascending: true });
      break;
    case "newest":
    default:
      query = query.order("created_at", { ascending: false });
  }

  // المميزة دايمًا فوق (تثبيت)
  query = query.order("status", { ascending: false }); // "visible" < "featured" أبجديًا... نظبطها تحت
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    items: data || [],
    total: count || 0,
    totalPages: Math.max(1, Math.ceil((count || 0) / pageSize)),
  };
}

// أنواع الأنشطة الموجودة فعليًا (لبناء فلتر "حسب نوع النشاط" ديناميكيًا)
export async function fetchDistinctBusinessTypes() {
  const { data, error } = await supabase
    .from(PACKAGES_TABLE)
    .select("business_type")
    .neq("status", "hidden");
  if (error) throw error;
  const set = new Set((data || []).map((r) => r.business_type).filter(Boolean));
  return Array.from(set);
}

export async function fetchPackageById(id) {
  const { data, error } = await supabase
    .from(PACKAGES_TABLE)
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

// إنشاء باقة جديدة (visitor أو admin) - الحالة دايمًا visible لغير الأدمن،
// الـ RLS بيفرض ده حتى لو حد لعب في الكود من المتصفح
export async function createPackage(payload) {
  const result = validatePackagePayload(payload);
  if (!result.valid) {
    throw new Error(result.error);
  }

  const { data, error } = await supabase
    .from(PACKAGES_TABLE)
    .insert([{ ...result.value, status: PACKAGE_STATUS.VISIBLE }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// تعديل باقة (أدمن فقط - الـ RLS بترفض أي محاولة من غير الأدمن)
export async function updatePackage(id, payload) {
  const result = validatePackagePayload(payload);
  if (!result.valid) {
    throw new Error(result.error);
  }

  const { data, error } = await supabase
    .from(PACKAGES_TABLE)
    .update({ ...result.value, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// تغيير الحالة فقط (إظهار/إخفاء/تثبيت كمميزة) - أدمن فقط
export async function setPackageStatus(id, status) {
  const { data, error } = await supabase
    .from(PACKAGES_TABLE)
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePackage(id) {
  const { error } = await supabase.from(PACKAGES_TABLE).delete().eq("id", id);
  if (error) throw error;
  return true;
}

// جلب كل الباقات للوحة تحكم الأدمن (بدون فلترة visible/hidden، الـ RLS بتسمح له يشوف الكل)
export async function fetchAllPackagesForAdmin() {
  const { data, error } = await supabase
    .from(PACKAGES_TABLE)
    .select("*")
    .order("status", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}
