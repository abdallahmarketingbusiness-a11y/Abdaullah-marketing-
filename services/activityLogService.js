// src/services/activityLogService.js
import { supabaseAdmin } from "../lib/supabaseAdminClient";
import { ACTIVITY_LOG_TABLE } from "../config/portfolioConfig";
import { getCurrentSession } from "./authService";

// تسجيل عملية إضافة/تعديل/حذف — best-effort، ما بيوقفش العملية الأساسية لو فشل
export async function logActivity({ action, entityType, entityId, details = {} }) {
  try {
    const session = await getCurrentSession();
    await supabaseAdmin.from(ACTIVITY_LOG_TABLE).insert([
      {
        actor_email: session?.user?.email || null,
        action,
        entity_type: entityType,
        entity_id: entityId ? String(entityId) : null,
        details,
      },
    ]);
  } catch {
    // تجاهل: السجل مش حرج لتنفيذ العملية نفسها
  }
}

export async function fetchActivityLog({ limit = 50 } = {}) {
  const { data, error } = await supabaseAdmin
    .from(ACTIVITY_LOG_TABLE)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

// سجل نشاط مرتبط بعنصر محدد (مثلاً: كل العمليات اللي اتعملت على عميل معيّن)
export async function fetchActivityLogForEntity({ entityType, entityId, limit = 50 }) {
  const { data, error } = await supabaseAdmin
    .from(ACTIVITY_LOG_TABLE)
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", String(entityId))
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}
