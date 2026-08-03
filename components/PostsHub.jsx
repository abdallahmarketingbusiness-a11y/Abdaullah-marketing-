// src/components/PostsHub.jsx
// نظام "منشورات الموقع" — شكل احترافي قريب من بوستات إنستقرام:
//  - PostsFeedSection: قسم في الصفحة الرئيسية بشكل فييد كارت إنستقرام (هيدر
//    + صورة + أزرار لايك/كومنت/شير + كابشن) + زرار "عرض جميع المنشورات".
//  - PostsGridPage: صفحة المنشورات الكاملة — شبكة مربعات (زي بروفايل
//    إنستقرام) مع العنوان والوصف المختصر تحت كل مربع + فلترة بالتصنيف.
//  - PostDetailPage: فييد عمودي (Snap Scroll) بين كل المنشورات — كل منشور
//    بياخد الشاشة كاملة زي إنستقرام، والنزول/الطلوع بالسكرول ينقّل بين
//    المنشورات، مع لايك وكومنت (بحماية من الألفاظ الخارجة) ومشاركة حقيقية.

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { GOLD, GOLD2, GOLD3 } from "../config/theme";
import { POST_CATEGORIES, postCategoryLabel, postCategoryEmoji } from "../config/contentConfig";
import {
  fetchPublished,
  fetchPublishedContentById,
  incrementContentViews,
} from "../services/contentService";
import {
  fetchLikesFor,
  toggleLike,
  fetchCommentCountsFor,
  fetchComments,
  addComment,
} from "../services/postEngagementService";
import { getVoterKey } from "../lib/voterKey";

// ---------------------------------------------------------------------------
// عناصر مساعدة صغيرة (نسخة محلية عشان الملف يفضل مستقل بذاته)
// ---------------------------------------------------------------------------
function useReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.05, rootMargin: "0px 0px -40px 0px" }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

function Reveal({ children, delay = 0, className = "" }) {
  const [ref, visible] = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(14px)",
        transition: `opacity 0.32s ease-out ${delay}ms, transform 0.32s ease-out ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-2 justify-center mb-4" style={{ color: GOLD }}>
      <div style={{ width: 28, height: 1, background: GOLD }} />
      <span className="text-xs font-bold tracking-widest">{children}</span>
      <div style={{ width: 28, height: 1, background: GOLD }} />
    </div>
  );
}

function LoadingState() {
  return (
    <div className="text-center py-16">
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>جاري التحميل...</p>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="text-center py-16">
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>{text}</p>
    </div>
  );
}

function CategoryBadge({ category }) {
  return (
    <span className="badge-gold">
      {postCategoryEmoji(category)} {postCategoryLabel(category)}
    </span>
  );
}

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return "";
  }
}

function postUrl(postId) {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}${window.location.pathname}#post-details?id=${postId}`;
}

// ---------------------------------------------------------------------------
// أيقونات (نفس أسلوب إنستقرام: قلب / بابل كومنت / ورقة الشير)
// ---------------------------------------------------------------------------
const iconBtnStyle = {
  width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center",
  border: "none", background: "transparent", color: "#eee", cursor: "pointer", borderRadius: "50%",
  flexShrink: 0, padding: 0,
};

function HeartIcon({ filled }) {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill={filled ? "#ff3040" : "none"} stroke={filled ? "#ff3040" : "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// زرار اللايك
// ---------------------------------------------------------------------------
function LikeButton({ liked, onToggle }) {
  return (
    <button onClick={onToggle} aria-label="لايك" style={iconBtnStyle}>
      <HeartIcon filled={liked} />
    </button>
  );
}

// ---------------------------------------------------------------------------
// زرار المشاركة — بيحاول شيت المشاركة الأصلي بتاع الجهاز أول (زي إنستقرام:
// يظهر واتساب/فيسبوك/إنستقرام... حسب التطبيقات المتاحة)، ولو المتصفح مش
// بيدعمها بيظهر قايمة بديلة بسيطة.
// ---------------------------------------------------------------------------
function ShareButton({ title, postId }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function handleClick(e) {
    e.stopPropagation();
    const url = postId ? postUrl(postId) : (typeof window !== "undefined" ? window.location.href : "");
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: title || "منشور من عبدالله ماركتنج", url });
      } catch {
        // المستخدم لغى المشاركة — تجاهل
      }
      return;
    }
    setOpen((v) => !v);
  }

  function shareTo(kind) {
    const url = postId ? postUrl(postId) : window.location.href;
    const text = encodeURIComponent(title || "");
    const links = {
      whatsapp: `https://wa.me/?text=${text}%20${encodeURIComponent(url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}`,
    };
    window.open(links[kind], "_blank", "noopener,noreferrer");
    setOpen(false);
  }

  async function copyLink() {
    const url = postId ? postUrl(postId) : window.location.href;
    try { await navigator.clipboard.writeText(url); } catch { /* تجاهل */ }
    setOpen(false);
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={handleClick} aria-label="مشاركة" style={iconBtnStyle}>
        <SendIcon />
      </button>
      {open && (
        <div
          dir="rtl"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute", top: "calc(100% + 6px)", insetInlineStart: 0, zIndex: 40,
            background: "#141210", border: "1px solid rgba(201,150,58,0.3)", borderRadius: 12,
            boxShadow: "0 14px 40px rgba(0,0,0,0.5)", overflow: "hidden", minWidth: 170,
          }}
        >
          <button onClick={() => shareTo("whatsapp")} style={shareItemStyle}>💬 واتساب</button>
          <button onClick={() => shareTo("facebook")} style={shareItemStyle}>📘 فيسبوك</button>
          <button onClick={() => shareTo("twitter")} style={shareItemStyle}>🐦 تويتر / X</button>
          <button onClick={copyLink} style={shareItemStyle}>🔗 نسخ الرابط</button>
        </div>
      )}
    </div>
  );
}
const shareItemStyle = {
  display: "block", width: "100%", textAlign: "right", padding: "10px 14px",
  background: "none", border: "none", color: "#eee", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
};

// ---------------------------------------------------------------------------
// كارت الفييد — شكل بوست إنستقرام كامل (هيدر + صورة + أزرار + كابشن)
// ---------------------------------------------------------------------------
function InstagramFeedCard({ post, onOpen, delay, liked, likeCount, commentCount, onToggleLike }) {
  return (
    <Reveal delay={delay}>
      <div className="rounded-2xl overflow-hidden" style={{ background: "#0b0b0b", border: "1px solid rgba(201,150,58,0.16)" }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg,${GOLD},${GOLD3})`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "#000", fontSize: 14, flexShrink: 0 }}>A</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{ color: "#fff" }}>Abdullah Marketing</p>
            <p className="text-[11px]" style={{ color: "#888" }}>{postCategoryEmoji(post.category)} {postCategoryLabel(post.category)} · {formatDate(post.created_at)}</p>
          </div>
        </div>

        <button onClick={() => onOpen(post.id)} className="relative w-full block" style={{ aspectRatio: "4/5", cursor: "pointer" }}>
          {post.cover_image_url ? (
            <Image src={post.cover_image_url} alt={post.title} fill sizes="(max-width: 640px) 100vw, 600px" className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(201,150,58,0.16), rgba(201,150,58,0.03))" }}>
              <span className="text-4xl opacity-40">✦</span>
            </div>
          )}
        </button>

        <div className="flex items-center gap-0.5 px-2.5 pt-2">
          <LikeButton liked={liked} onToggle={() => onToggleLike(post.id)} />
          <button onClick={() => onOpen(post.id)} aria-label="تعليق" style={iconBtnStyle}><CommentIcon /></button>
          <ShareButton title={post.title} postId={post.id} />
        </div>

        <div className="px-4 pt-0.5">
          <p className="text-xs font-bold" style={{ color: "#fff" }}>
            {likeCount > 0 ? `${likeCount} ${likeCount === 1 ? "لايك" : "لايكات"}` : "كن أول من يعمل لايك"}
          </p>
        </div>

        <div className="px-4 pt-1.5">
          <p className="text-sm leading-relaxed">
            <span className="font-bold" style={{ color: "#fff" }}>Abdullah Marketing</span>{" "}
            <span className="font-black" style={{ color: GOLD3 }}>{post.title}</span>
          </p>
          {post.excerpt && <p className="text-sm mt-0.5 line-clamp-2" style={{ color: "#aaa" }}>{post.excerpt}</p>}
        </div>

        <button onClick={() => onOpen(post.id)} className="px-4 py-2.5 block text-xs w-full text-right" style={{ color: "#888", cursor: "pointer" }}>
          {commentCount > 0 ? `عرض كل التعليقات (${commentCount})` : "أضف تعليق..."}
        </button>
      </div>
    </Reveal>
  );
}

// ---------------------------------------------------------------------------
// كارت الشبكة — مربع زي بروفايل إنستقرام، مع العنوان والوصف تحته
// ---------------------------------------------------------------------------
function InstagramGridCard({ post, onOpen, delay, likeCount, commentCount }) {
  return (
    <Reveal delay={delay}>
      <button onClick={() => onOpen(post.id)} className="w-full text-right group block" style={{ cursor: "pointer" }}>
        <div className="relative w-full overflow-hidden rounded-xl" style={{ aspectRatio: "1/1", border: "1px solid rgba(201,150,58,0.16)" }}>
          {post.cover_image_url ? (
            <Image src={post.cover_image_url} alt={post.title} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" className="object-cover transition-transform duration-300 group-hover:scale-105" />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(201,150,58,0.16), rgba(201,150,58,0.03))" }}>
              <span className="text-3xl opacity-40">✦</span>
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center gap-5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" style={{ background: "rgba(0,0,0,0.45)" }}>
            <span className="flex items-center gap-1.5 text-white font-bold text-xs"><HeartIcon filled /> {likeCount}</span>
            <span className="flex items-center gap-1.5 text-white font-bold text-xs"><CommentIcon /> {commentCount}</span>
          </div>
          <span className="absolute top-2 right-2"><CategoryBadge category={post.category} /></span>
        </div>
        <div className="pt-2.5 pb-1">
          <h3 className="text-sm font-black line-clamp-1" style={{ color: "var(--text-primary)" }}>{post.title}</h3>
          {post.excerpt && <p className="text-xs leading-relaxed line-clamp-2 mt-0.5" style={{ color: "var(--text-muted)" }}>{post.excerpt}</p>}
        </div>
      </button>
    </Reveal>
  );
}

// ---------------------------------------------------------------------------
// 1) قسم الصفحة الرئيسية: أحدث المنشورات بشكل فييد إنستقرام
// ---------------------------------------------------------------------------
export function PostsFeedSection({ onOpenPost, onViewAll }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [likes, setLikes] = useState({});
  const [commentCounts, setCommentCounts] = useState({});
  const voterKey = useRef(getVoterKey());

  useEffect(() => {
    let alive = true;
    fetchPublished("sitePosts", { limit: 5 })
      .then((data) => {
        if (!alive) return;
        setItems(data);
        const ids = data.map((p) => p.id);
        fetchLikesFor(ids, voterKey.current).then(({ counts, likedByMe }) => {
          if (!alive) return;
          const map = {};
          ids.forEach((id) => { map[id] = { count: counts[id] || 0, liked: !!likedByMe[id] }; });
          setLikes(map);
        }).catch(() => {});
        fetchCommentCountsFor(ids).then((counts) => { if (alive) setCommentCounts(counts); }).catch(() => {});
      })
      .catch(() => { if (alive) setItems([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  async function handleToggleLike(postId) {
    const current = likes[postId] || { count: 0, liked: false };
    const nextLiked = !current.liked;
    setLikes((m) => ({ ...m, [postId]: { count: current.count + (nextLiked ? 1 : -1), liked: nextLiked } }));
    try {
      await toggleLike(postId, voterKey.current, current.liked);
    } catch {
      setLikes((m) => ({ ...m, [postId]: current })); // رجوع لو فشل
    }
  }

  if (!loading && items.length === 0) return null; // مفيش داعي نعرض قسم فاضي في الرئيسية

  return (
    <section dir="rtl" className="px-6 md:px-10 py-16 md:py-20" style={{ background: "var(--bg-elevated)" }}>
      <div className="max-w-lg mx-auto">
        <Reveal className="text-center mb-10">
          <SectionLabel>LATEST UPDATES</SectionLabel>
          <h2 className="text-2xl md:text-4xl font-black tracking-wide mt-3 mb-3" style={{ fontFamily: "var(--font-cinzel), serif", color: "var(--text-primary)" }}>
            أحدث المنشورات
          </h2>
          <p className="text-sm md:text-base" style={{ color: "var(--text-secondary)" }}>
            نصائح، عروض، وأخبار بنشاركها معاك أول بأول
          </p>
        </Reveal>

        {loading ? (
          <LoadingState />
        ) : (
          <div className="flex flex-col gap-6">
            {items.map((p, i) => (
              <InstagramFeedCard
                key={p.id}
                post={p}
                onOpen={onOpenPost}
                delay={i * 70}
                liked={likes[p.id]?.liked || false}
                likeCount={likes[p.id]?.count || 0}
                commentCount={commentCounts[p.id] || 0}
                onToggleLike={handleToggleLike}
              />
            ))}
          </div>
        )}

        <Reveal delay={items.length * 70 + 100} className="text-center mt-10">
          <button onClick={onViewAll} className="btn-outline">عرض جميع المنشورات</button>
        </Reveal>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 2) صفحة المنشورات الكاملة — شبكة مربعات زي بروفايل إنستقرام
// ---------------------------------------------------------------------------
export function PostsGridPage({ onOpenPost }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [likeCounts, setLikeCounts] = useState({});
  const [commentCounts, setCommentCounts] = useState({});

  useEffect(() => {
    let alive = true;
    fetchPublished("sitePosts")
      .then((data) => {
        if (!alive) return;
        setItems(data);
        const ids = data.map((p) => p.id);
        fetchLikesFor(ids, "").then(({ counts }) => { if (alive) setLikeCounts(counts); }).catch(() => {});
        fetchCommentCountsFor(ids).then((counts) => { if (alive) setCommentCounts(counts); }).catch(() => {});
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const filtered = items.filter((p) => filter === "all" || p.category === filter);
  const usedCategories = POST_CATEGORIES.filter((c) => items.some((p) => p.category === c.id));

  return (
    <div
      dir="rtl"
      className="min-h-screen px-6 py-28 relative"
      style={{ background: "#050505", backgroundImage: "radial-gradient(ellipse 60% 30% at 50% 0%, rgba(201,150,58,0.10), transparent 70%)" }}
    >
      <div className="max-w-6xl mx-auto relative" style={{ zIndex: 1 }}>
        <Reveal className="text-center mb-12 max-w-2xl mx-auto">
          <SectionLabel>OUR POSTS</SectionLabel>
          <h1 className="text-3xl md:text-5xl font-black tracking-wide mt-3 mb-4" style={{ fontFamily: "var(--font-cinzel), serif", color: "#fff" }}>المنشورات</h1>
          <p className="text-sm md:text-base leading-relaxed" style={{ color: "#999" }}>
            نصائح تسويقية، عروض وخصومات، أخبار وتحديثات، وأفكار جديدة — كل حاجة بتخص علامتك التجارية في مكان واحد.
          </p>
        </Reveal>

        {usedCategories.length > 0 && (
          <Reveal className="flex items-center justify-center gap-2 mb-10 flex-wrap">
            <button
              onClick={() => setFilter("all")}
              className="text-xs font-bold px-4 py-2 rounded-full transition"
              style={{
                border: `1px solid ${filter === "all" ? GOLD : "rgba(255,255,255,0.15)"}`,
                background: filter === "all" ? "rgba(201,150,58,0.14)" : "transparent",
                color: filter === "all" ? GOLD3 : "#888",
              }}
            >
              الكل
            </button>
            {usedCategories.map((c) => (
              <button
                key={c.id}
                onClick={() => setFilter(c.id)}
                className="text-xs font-bold px-4 py-2 rounded-full transition"
                style={{
                  border: `1px solid ${filter === c.id ? GOLD : "rgba(255,255,255,0.15)"}`,
                  background: filter === c.id ? "rgba(201,150,58,0.14)" : "transparent",
                  color: filter === c.id ? GOLD3 : "#888",
                }}
              >
                {c.emoji} {c.label}
              </button>
            ))}
          </Reveal>
        )}

        {loading ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyState text="لسه مفيش منشورات منشورة — تقدر تضيفها من لوحة السوبر أدمن." />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-5">
            {filtered.map((p, i) => (
              <InstagramGridCard
                key={p.id}
                post={p}
                onOpen={onOpenPost}
                delay={i * 50}
                likeCount={likeCounts[p.id] || 0}
                commentCount={commentCounts[p.id] || 0}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// صندوق كتابة تعليق + قائمة التعليقات (مستخدم جوّه SinglePostView)
// ---------------------------------------------------------------------------
const commentInputStyle = {
  width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(201,150,58,0.2)",
  borderRadius: 10, padding: "9px 12px", color: "#fff", fontSize: 13, outline: "none", marginBottom: 8,
};

function CommentsBlock({ postId }) {
  const [comments, setComments] = useState(null);
  const [authorName, setAuthorName] = useState("");
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    fetchComments(postId).then((rows) => { if (alive) setComments(rows); }).catch(() => { if (alive) setComments([]); });
    return () => { alive = false; };
  }, [postId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setPosting(true);
    try {
      const saved = await addComment(postId, { authorName, commentText });
      setComments((list) => [saved, ...(list || [])]);
      setCommentText("");
    } catch (err) {
      setError(err.message || "حصل خطأ، حاول تاني.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div>
      <h3 className="text-sm font-black mb-3" style={{ color: "#fff" }}>💬 التعليقات {comments ? `(${comments.length})` : ""}</h3>

      <form onSubmit={handleSubmit} className="mb-5">
        <input value={authorName} onChange={(e) => setAuthorName(e.target.value)} placeholder="اسمك" style={commentInputStyle} maxLength={40} required />
        <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="اكتب تعليقك..." rows={2} style={{ ...commentInputStyle, resize: "vertical" }} maxLength={500} required />
        {error && <p className="text-xs mb-2" style={{ color: "#ff6a6a" }}>{error}</p>}
        <button
          type="submit"
          disabled={posting}
          style={{ padding: "8px 18px", borderRadius: 10, border: "none", fontWeight: 800, fontSize: 12.5, color: "#000", background: `linear-gradient(135deg,${GOLD},${GOLD2})`, cursor: "pointer", opacity: posting ? 0.6 : 1 }}
        >
          {posting ? "جاري النشر..." : "نشر التعليق"}
        </button>
      </form>

      {comments === null ? (
        <p className="text-xs" style={{ color: "#666" }}>جاري تحميل التعليقات...</p>
      ) : comments.length === 0 ? (
        <p className="text-xs" style={{ color: "#666" }}>كن أول من يعلّق على هذا المنشور.</p>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2.5">
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(201,150,58,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: GOLD, fontSize: 12, flexShrink: 0 }}>
                {(c.author_name || "?")[0]}
              </div>
              <div>
                <p className="text-xs leading-relaxed">
                  <span className="font-bold" style={{ color: "#fff" }}>{c.author_name}</span>{" "}
                  <span style={{ color: "#ccc" }}>{c.comment_text}</span>
                </p>
                <p className="text-[10.5px] mt-0.5" style={{ color: "#666" }}>{formatDate(c.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// منشور واحد كامل — جوّه الفييد العمودي (Snap Scroll)
// ---------------------------------------------------------------------------
function SinglePostView({ post, onBack, active }) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const voterKey = useRef(getVoterKey());

  useEffect(() => {
    let alive = true;
    fetchLikesFor([post.id], voterKey.current).then(({ counts, likedByMe }) => {
      if (!alive) return;
      setLikeCount(counts[post.id] || 0);
      setLiked(!!likedByMe[post.id]);
    }).catch(() => {});
    return () => { alive = false; };
  }, [post.id]);

  async function handleToggleLike() {
    const wasLiked = liked;
    const nextLiked = !wasLiked;
    setLiked(nextLiked);
    setLikeCount((c) => c + (nextLiked ? 1 : -1));
    try {
      await toggleLike(post.id, voterKey.current, wasLiked);
    } catch {
      setLiked(wasLiked);
      setLikeCount((c) => c + (nextLiked ? -1 : 1));
    }
  }

  const contentParagraphs = (post.content || "").split(/\n+/).filter(Boolean);

  return (
    <div dir="rtl" style={{ height: "100%", display: "flex", flexDirection: "column", background: "#050505", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: "radial-gradient(ellipse 70% 45% at 50% 0%, rgba(201,150,58,0.14), transparent 70%)" }} />

      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0 relative" style={{ borderBottom: "1px solid rgba(201,150,58,0.14)", zIndex: 1 }}>
        <button onClick={onBack} style={{ color: GOLD, fontSize: 13, fontWeight: 800, background: "none", border: "none", cursor: "pointer" }}>→ كل المنشورات</button>
        <div className="flex-1" />
        <CategoryBadge category={post.category} />
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", position: "relative", zIndex: 1 }}>
        {post.cover_image_url && (
          <div className="relative w-full" style={{ aspectRatio: "4/5", maxHeight: "55vh" }}>
            <Image src={post.cover_image_url} alt={post.title} fill sizes="100vw" className="object-cover" priority={active} />
          </div>
        )}

        <div className="px-5 py-4 max-w-2xl mx-auto">
          <div className="flex items-center gap-0.5 -mx-1 mb-1">
            <LikeButton liked={liked} onToggle={handleToggleLike} />
            <ShareButton title={post.title} postId={post.id} />
          </div>
          <p className="text-xs font-bold mb-3" style={{ color: "#fff" }}>
            {likeCount > 0 ? `${likeCount} ${likeCount === 1 ? "لايك" : "لايكات"}` : "كن أول من يعمل لايك"}
          </p>

          <h1 className="text-xl md:text-2xl font-black mb-2" style={{ color: "#fff", fontFamily: "var(--font-cinzel), serif" }}>{post.title}</h1>
          <div className="flex items-center gap-2 mb-4 text-xs flex-wrap" style={{ color: "#888" }}>
            <span>{post.author || "Abdullah Marketing"}</span>
            <span>·</span>
            <span>{formatDate(post.created_at)}</span>
            <span>·</span>
            <span>{post.read_time_minutes || 3} دقايق قراءة</span>
          </div>

          {post.caption && <p className="text-xs mb-4" style={{ color: "#999" }}>{post.caption}</p>}

          <div className="space-y-3 mb-6">
            {contentParagraphs.length > 0 ? (
              contentParagraphs.map((para, i) => (
                <p key={i} className="text-sm leading-loose" style={{ color: "#ccc" }}>{para}</p>
              ))
            ) : (
              post.excerpt && <p className="text-sm leading-loose" style={{ color: "#ccc" }}>{post.excerpt}</p>
            )}
          </div>

          {Array.isArray(post.gallery_urls) && post.gallery_urls.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-6">
              {post.gallery_urls.map((url, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden">
                  <Image src={url} alt={`${post.title} ${i + 1}`} fill sizes="33vw" className="object-cover" />
                </div>
              ))}
            </div>
          )}

          <div style={{ height: 1, background: "rgba(201,150,58,0.15)", margin: "18px 0 22px" }} />

          <CommentsBlock postId={post.id} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3) فييد عمودي بين كل المنشورات (Snap Scroll) — زي إنستقرام: النزول/الطلوع
//    بالسكرول ينقّل للمنشور اللي بعده/قبله
// ---------------------------------------------------------------------------
export function PostDetailPage({ postId, onBack }) {
  const [allPosts, setAllPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeId, setActiveId] = useState(postId);
  const itemRefs = useRef({});
  const didInitialScroll = useRef(false);

  useEffect(() => {
    let alive = true;
    fetchPublished("sitePosts")
      .then((all) => {
        if (!alive) return;
        if (!all.some((p) => p.id === postId)) {
          // المنشور المطلوب مش موجود في الأساسي (ممكن يكون منشور واحد يتفتح
          // مباشرة من رابط قديم) — نجيبه لوحده ونضيفه في الأول
          return fetchPublishedContentById("sitePosts", postId)
            .then((p) => { if (alive) setAllPosts([p, ...all]); })
            .catch(() => { if (alive) setNotFound(true); });
        }
        setAllPosts(all);
      })
      .catch(() => { if (alive) setNotFound(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [postId]);

  // سكرول أولي لمكان المنشور المطلوب لحظة ما القائمة تجهز
  useEffect(() => {
    if (loading || didInitialScroll.current) return;
    const el = itemRefs.current[postId];
    if (el) {
      el.scrollIntoView({ block: "start" });
      didInitialScroll.current = true;
      incrementContentViews("sitePosts", postId);
    }
  }, [loading, postId, allPosts]);

  // تتبّع المنشور الظاهر حاليًا في الشاشة — بيحدّث الرابط (بدون إعادة تحميل)
  // وعداد المشاهدات، زي ما اليوزر ينزل/يطلع بين المنشورات
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            const id = entry.target.dataset.postId;
            if (id && id !== activeId) {
              setActiveId(id);
              if (typeof window !== "undefined") window.history.replaceState(null, "", `#post-details?id=${id}`);
              incrementContentViews("sitePosts", id);
            }
          }
        });
      },
      { threshold: [0.6] }
    );
    Object.values(itemRefs.current).forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [allPosts, activeId]);

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen px-6 py-28" style={{ background: "#050505" }}>
        <LoadingState />
      </div>
    );
  }

  if (notFound || allPosts.length === 0) {
    return (
      <div dir="rtl" className="min-h-screen px-6 py-28 text-center" style={{ background: "#050505" }}>
        <EmptyState text="المنشور غير موجود أو تم حذفه." />
        <button onClick={onBack} className="btn-outline mt-4">الرجوع لكل المنشورات</button>
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: 72, height: "calc(100vh - 72px)", overflowY: "auto", scrollSnapType: "y mandatory",
        background: "#050505", WebkitOverflowScrolling: "touch",
      }}
    >
      {allPosts.map((post) => (
        <div
          key={post.id}
          ref={(el) => { itemRefs.current[post.id] = el; }}
          data-post-id={post.id}
          style={{ height: "calc(100vh - 72px)", scrollSnapAlign: "start", scrollSnapStop: "always" }}
        >
          <SinglePostView post={post} onBack={onBack} active={post.id === activeId} />
        </div>
      ))}
    </div>
  );
}
