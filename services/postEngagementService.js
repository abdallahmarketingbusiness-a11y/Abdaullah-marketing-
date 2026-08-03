// src/services/postEngagementService.js
// اللايك والكومنت على منشورات الموقع — بدون تسجيل دخول، زي أي موقع عادي.
// الجداول: site_post_likes و site_post_comments (شوف sql/migration_post_engagement.sql)
import { supabase } from "../lib/supabaseClient";
import { containsProfanity } from "../lib/profanityFilter";

// عدد اللايكات + هل الجهاز الحالي لايك المنشورات دي قبل كده، لمجموعة منشورات
// دفعة واحدة (عشان الفييد/الجريد ما يعملش استعلام منفصل لكل منشور).
export async function fetchLikesFor(postIds, voterKey) {
  const counts = {};
  const likedByMe = {};
  postIds.forEach((id) => { counts[id] = 0; likedByMe[id] = false; });
  if (!postIds.length) return { counts, likedByMe };

  const { data, error } = await supabase
    .from("site_post_likes")
    .select("post_id, voter_key")
    .in("post_id", postIds);
  if (error) throw error;

  (data || []).forEach((row) => {
    counts[row.post_id] = (counts[row.post_id] || 0) + 1;
    if (voterKey && row.voter_key === voterKey) likedByMe[row.post_id] = true;
  });

  return { counts, likedByMe };
}

// عكس حالة اللايك (لايك لو مش لايك، شيل اللايك لو لايك قبل كده)
export async function toggleLike(postId, voterKey, currentlyLiked) {
  if (currentlyLiked) {
    const { error } = await supabase
      .from("site_post_likes")
      .delete()
      .eq("post_id", postId)
      .eq("voter_key", voterKey);
    if (error) throw error;
    return false;
  }
  const { error } = await supabase
    .from("site_post_likes")
    .insert([{ post_id: postId, voter_key: voterKey }]);
  if (error) throw error;
  return true;
}

// عدد التعليقات المعتمدة على مجموعة منشورات دفعة واحدة
export async function fetchCommentCountsFor(postIds) {
  const counts = {};
  postIds.forEach((id) => { counts[id] = 0; });
  if (!postIds.length) return counts;

  const { data, error } = await supabase
    .from("site_post_comments")
    .select("post_id")
    .in("post_id", postIds)
    .eq("status", "approved");
  if (error) throw error;

  (data || []).forEach((row) => { counts[row.post_id] = (counts[row.post_id] || 0) + 1; });
  return counts;
}

// كل تعليقات منشور واحد (الأحدث أولًا)
export async function fetchComments(postId) {
  const { data, error } = await supabase
    .from("site_post_comments")
    .select("*")
    .eq("post_id", postId)
    .eq("status", "approved")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

// إضافة تعليق جديد — بيترفض لو فيه لفظ خارج (فلتر الموقع، قبل ما يوصل لقاعدة
// البيانات أساسًا؛ الحماية التانية على مستوى قاعدة البيانات نفسها كاحتياط).
export async function addComment(postId, { authorName, commentText }) {
  const name = (authorName || "").trim();
  const text = (commentText || "").trim();

  if (name.length < 2) throw new Error("الاسم مطلوب.");
  if (text.length < 2) throw new Error("التعليق قصير جدًا.");
  if (containsProfanity(name) || containsProfanity(text)) {
    throw new Error("التعليق يحتوي على ألفاظ غير مناسبة، من فضلك عدّله وحاول تاني.");
  }

  const { data, error } = await supabase
    .from("site_post_comments")
    .insert([{ post_id: postId, author_name: name, comment_text: text }])
    .select()
    .single();
  if (error) {
    // لو الطبقة الثانية (قاعدة البيانات) هي اللي رفضت التعليق
    if (error.message?.includes("chk_comment_no_slurs")) {
      throw new Error("التعليق يحتوي على ألفاظ غير مناسبة، من فضلك عدّله وحاول تاني.");
    }
    throw error;
  }
  return data;
}
