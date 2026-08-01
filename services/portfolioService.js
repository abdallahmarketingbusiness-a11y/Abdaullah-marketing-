// src/services/portfolioService.js
import { supabase } from "../lib/supabaseClient";
import { supabaseAdmin } from "../lib/supabaseAdminClient";
import {
  PORTFOLIO_TABLE,
  PORTFOLIO_IMAGES_TABLE,
  PORTFOLIO_SOURCE_FILES_TABLE,
  DESIGN_REQUESTS_TABLE,
  PORTFOLIO_STATUS,
  PORTFOLIO_GALLERY,
  STORAGE_BUCKETS,
} from "../config/portfolioConfig";
import { logActivity } from "./activityLogService";

// ---------------------------------------------------------------------------
// عرض الموقع (Public) — بحث + فلترة حسب التصنيف + ترتيب + pagination
// ---------------------------------------------------------------------------
export async function fetchPortfolioItems({
  search = "",
  category = "all",
  page = 1,
} = {}) {
  const pageSize = PORTFOLIO_GALLERY.pageSize;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from(PORTFOLIO_TABLE)
    .select("*", { count: "exact" })
    .eq("status", PORTFOLIO_STATUS.PUBLISHED);

  if (search && search.trim()) {
    const term = search.trim();
    query = query.or(`title.ilike.%${term}%,short_description.ilike.%${term}%`);
  }

  if (category && category !== "all") {
    query = query.eq("category", category);
  }

  query = query
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    items: data || [],
    total: count || 0,
    totalPages: Math.max(1, Math.ceil((count || 0) / pageSize)),
  };
}

export async function fetchFeaturedPortfolioItems(limit = 6) {
  const { data, error } = await supabase
    .from(PORTFOLIO_TABLE)
    .select("*")
    .eq("status", PORTFOLIO_STATUS.PUBLISHED)
    .eq("is_featured", true)
    .order("sort_order", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function fetchDistinctCategories() {
  const { data, error } = await supabase
    .from(PORTFOLIO_TABLE)
    .select("category")
    .eq("status", PORTFOLIO_STATUS.PUBLISHED);
  if (error) throw error;
  const set = new Set((data || []).map((r) => r.category).filter(Boolean));
  return Array.from(set);
}

export async function fetchPortfolioItemById(id) {
  const { data, error } = await supabase
    .from(PORTFOLIO_TABLE)
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function fetchPortfolioImages(portfolioId) {
  const { data, error } = await supabase
    .from(PORTFOLIO_IMAGES_TABLE)
    .select("*")
    .eq("portfolio_id", portfolioId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data || [];
}

// زيادة عداد المشاهدات (best-effort، مش لازم تفشل التجربة لو حصل خطأ)
export async function incrementViews(id) {
  try {
    await supabase.rpc("increment_portfolio_views", { row_id: id }).catch(async () => {
      // fallback لو الدالة مش موجودة: تحديث مباشر (سباق بسيط لكن مقبول لعداد عرض)
      const { data } = await supabase.from(PORTFOLIO_TABLE).select("views_count").eq("id", id).single();
      const current = data?.views_count || 0;
      await supabase.from(PORTFOLIO_TABLE).update({ views_count: current + 1 }).eq("id", id);
    });
  } catch {
    // تجاهل أي خطأ هنا، العداد مش حرج
  }
}

// تسجيل "طلب تصميم مشابه" + زيادة عداده
export async function logDesignRequest(portfolioId) {
  try {
    await supabase.from(DESIGN_REQUESTS_TABLE).insert([{ portfolio_id: portfolioId }]);
    const { data } = await supabase
      .from(PORTFOLIO_TABLE)
      .select("requests_count")
      .eq("id", portfolioId)
      .single();
    const current = data?.requests_count || 0;
    await supabase
      .from(PORTFOLIO_TABLE)
      .update({ requests_count: current + 1 })
      .eq("id", portfolioId);
  } catch {
    // best-effort فقط
  }
}

// ---------------------------------------------------------------------------
// لوحة السوبر أدمن
// ---------------------------------------------------------------------------
export async function fetchAllPortfolioItemsForAdmin({ search = "", category = "all" } = {}) {
  let query = supabaseAdmin.from(PORTFOLIO_TABLE).select("*");

  if (search && search.trim()) {
    const term = search.trim();
    query = query.or(`title.ilike.%${term}%,short_description.ilike.%${term}%,client_name.ilike.%${term}%`);
  }
  if (category && category !== "all") {
    query = query.eq("category", category);
  }

  query = query.order("is_pinned", { ascending: false }).order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createPortfolioItem(payload) {
  const { data, error } = await supabaseAdmin
    .from(PORTFOLIO_TABLE)
    .insert([{ ...payload }])
    .select()
    .single();
  if (error) throw error;
  await logActivity({ action: "create", entityType: "portfolio_items", entityId: data.id, details: { title: data.title } });
  return data;
}

export async function updatePortfolioItem(id, payload) {
  const { data, error } = await supabaseAdmin
    .from(PORTFOLIO_TABLE)
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  await logActivity({ action: "update", entityType: "portfolio_items", entityId: id, details: { title: data.title } });
  return data;
}

export async function setPortfolioStatus(id, status) {
  const { data, error } = await supabaseAdmin
    .from(PORTFOLIO_TABLE)
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  await logActivity({ action: "status_change", entityType: "portfolio_items", entityId: id, details: { status } });
  return data;
}

export async function setPortfolioFeatured(id, isFeatured) {
  const { data, error } = await supabaseAdmin
    .from(PORTFOLIO_TABLE)
    .update({ is_featured: isFeatured, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// تثبيت منشور: بيلغي تثبيت أي منشور تاني تلقائيًا (منشور واحد ثابت بس في كل مرة)
export async function setPortfolioPinned(id, isPinned) {
  if (isPinned) {
    const { error: unpinError } = await supabaseAdmin
      .from(PORTFOLIO_TABLE)
      .update({ is_pinned: false })
      .neq("id", id)
      .eq("is_pinned", true);
    if (unpinError) throw unpinError;
  }

  const { data, error } = await supabaseAdmin
    .from(PORTFOLIO_TABLE)
    .update({ is_pinned: isPinned, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  await logActivity({ action: isPinned ? "pin" : "unpin", entityType: "portfolio_items", entityId: id, details: { title: data.title } });
  return data;
}

export async function deletePortfolioItem(id) {
  const { error } = await supabaseAdmin.from(PORTFOLIO_TABLE).delete().eq("id", id);
  if (error) throw error;
  await logActivity({ action: "delete", entityType: "portfolio_items", entityId: id });
  return true;
}

// حذف/نشر جماعي
export async function bulkDeletePortfolioItems(ids) {
  const { error } = await supabaseAdmin.from(PORTFOLIO_TABLE).delete().in("id", ids);
  if (error) throw error;
  await logActivity({ action: "bulk_delete", entityType: "portfolio_items", details: { ids } });
  return true;
}

export async function bulkSetStatus(ids, status) {
  const { error } = await supabaseAdmin
    .from(PORTFOLIO_TABLE)
    .update({ status, updated_at: new Date().toISOString() })
    .in("id", ids);
  if (error) throw error;
  await logActivity({ action: "bulk_status_change", entityType: "portfolio_items", details: { ids, status } });
  return true;
}

// إعادة الترتيب بالسحب: بتاخد مصفوفة [{id, sort_order}]
export async function reorderPortfolioItems(orderedList) {
  const updates = orderedList.map(({ id, sort_order }) =>
    supabaseAdmin.from(PORTFOLIO_TABLE).update({ sort_order }).eq("id", id)
  );
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed) throw failed.error;
  return true;
}

// نسخ تصميم موجود (Duplicate) — بينسخ الحقول الأساسية والصور الإضافية كـ "مسودة"
export async function duplicatePortfolioItem(id) {
  const original = await fetchPortfolioItemById(id);
  const images = await fetchPortfolioImages(id);

  const { id: _oldId, created_at, updated_at, views_count, requests_count, ...rest } = original;

  const copy = await createPortfolioItem({
    ...rest,
    title: `${original.title} (نسخة)`,
    status: PORTFOLIO_STATUS.DRAFT,
    is_featured: false,
    views_count: 0,
    requests_count: 0,
  });

  if (images.length) {
    const rows = images.map((img) => ({
      portfolio_id: copy.id,
      image_url: img.image_url,
      sort_order: img.sort_order,
    }));
    await supabaseAdmin.from(PORTFOLIO_IMAGES_TABLE).insert(rows);
  }

  return copy;
}

// ---------------------------------------------------------------------------
// صور المعرض الإضافية
// ---------------------------------------------------------------------------
export async function addPortfolioImage(portfolioId, imageUrl, sortOrder = 0) {
  const { data, error } = await supabaseAdmin
    .from(PORTFOLIO_IMAGES_TABLE)
    .insert([{ portfolio_id: portfolioId, image_url: imageUrl, sort_order: sortOrder }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePortfolioImage(imageId) {
  const { error } = await supabaseAdmin.from(PORTFOLIO_IMAGES_TABLE).delete().eq("id", imageId);
  if (error) throw error;
  return true;
}

// ---------------------------------------------------------------------------
// ملفات المصدر الداخلية (PSD / AI / PDF)
// ---------------------------------------------------------------------------
export async function fetchPortfolioSourceFiles(portfolioId) {
  const { data, error } = await supabaseAdmin
    .from(PORTFOLIO_SOURCE_FILES_TABLE)
    .select("*")
    .eq("portfolio_id", portfolioId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addPortfolioSourceFile(portfolioId, fileUrl, fileName) {
  const { data, error } = await supabaseAdmin
    .from(PORTFOLIO_SOURCE_FILES_TABLE)
    .insert([{ portfolio_id: portfolioId, file_url: fileUrl, file_name: fileName }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePortfolioSourceFile(fileId) {
  const { error } = await supabaseAdmin.from(PORTFOLIO_SOURCE_FILES_TABLE).delete().eq("id", fileId);
  if (error) throw error;
  return true;
}

// ---------------------------------------------------------------------------
// رفع الصور إلى Supabase Storage
// ---------------------------------------------------------------------------
export async function uploadPortfolioImage(file, { bucket = STORAGE_BUCKETS.PORTFOLIO } = {}) {
  const ext = file.name.split(".").pop();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabaseAdmin.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadPortfolioSourceFile(file) {
  const path = `${crypto.randomUUID()}_${file.name}`;
  const { error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKETS.PORTFOLIO_SOURCES)
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw error;
  return path; // ملفات داخلية، بترجع الـ path مش رابط عام
}

// ---------------------------------------------------------------------------
// بناء رسالة واتساب لزرار "اطلب تصميم مشابه"
// ---------------------------------------------------------------------------
export function buildWhatsappOrderMessage(item, { whatsappNumber, pageUrl } = {}) {
  const lines = [
    `مرحبًا، أريد طلب تصميم مشابه لهذا التصميم:`,
    `📌 الاسم: ${item.title}`,
    item.short_description ? `📝 الوصف: ${item.short_description}` : null,
    pageUrl ? `🔗 رابط التصميم: ${pageUrl}` : null,
    item.main_image_url ? `🖼️ رابط الصورة: ${item.main_image_url}` : null,
  ].filter(Boolean);

  const text = encodeURIComponent(lines.join("\n"));
  return `https://wa.me/${whatsappNumber}?text=${text}`;
}
