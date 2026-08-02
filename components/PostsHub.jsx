// src/components/PostsHub.jsx
// نظام "منشورات الموقع" الجديد — منفصل تمامًا عن معرض الأعمال:
// نصائح تسويقية / عروض / خصومات / أخبار / تحديثات / توعية / أفكار / إعلانات.
//
// 3 أجزاء في نفس الملف:
//  - PostsFeedSection: قسم في الصفحة الرئيسية بيعرض أحدث 5 منشورات بشكل فييد
//    عمودي احترافي (زي مواقع السوشيال ميديا) + زرار "عرض جميع المنشورات".
//  - PostsGridPage: صفحة المنشورات الكاملة — Grid احترافي + فلترة بالتصنيف.
//  - PostDetailPage: صفحة المنشور المستقلة — صورة، عنوان، محتوى، كابشن،
//    تاريخ، كاتب، مدة قراءة، منشورات مشابهة، أزرار مشاركة، وتنقل سلس
//    بين المنشور السابق والتالي.

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { GOLD, GOLD3 } from "../config/theme";
import { POST_CATEGORIES, postCategoryLabel, postCategoryEmoji } from "../config/contentConfig";
import {
  fetchPublished,
  fetchPublishedContentById,
  fetchRelatedContent,
  incrementContentViews,
} from "../services/contentService";

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

// ---------------------------------------------------------------------------
// أزرار المشاركة
// ---------------------------------------------------------------------------
function ShareButtons({ title }) {
  const [copied, setCopied] = useState(false);
  const share = (kind) => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    const text = encodeURIComponent(title || "");
    const links = {
      whatsapp: `https://wa.me/?text=${text}%20${encodeURIComponent(url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}`,
    };
    window.open(links[kind], "_blank", "noopener,noreferrer");
  };
  const copyLink = async () => {
    if (typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // تجاهل
    }
  };
  const btnStyle = {
    width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
    border: "1px solid var(--border)", background: "var(--bg-card)", cursor: "pointer", fontSize: 16,
    transition: "transform 0.2s ease, border-color 0.2s ease",
  };
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>شارك المنشور:</span>
      <button onClick={() => share("whatsapp")} title="واتساب" style={btnStyle}>💬</button>
      <button onClick={() => share("facebook")} title="فيسبوك" style={btnStyle}>📘</button>
      <button onClick={() => share("twitter")} title="تويتر / X" style={btnStyle}>🐦</button>
      <button onClick={copyLink} title="نسخ الرابط" style={btnStyle}>{copied ? "✅" : "🔗"}</button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card موحّد يستخدم في الفييد وفي صفحة الـ Grid
// ---------------------------------------------------------------------------
function PostCard({ post, onOpen, delay = 0, variant = "grid" }) {
  if (variant === "feed") {
    // كارت أفقي بأسلوب فييد السوشيال ميديا
    return (
      <Reveal delay={delay}>
        <button
          onClick={() => onOpen(post.id)}
          className="w-full text-right card-pro rounded-2xl overflow-hidden flex flex-col sm:flex-row gap-0 sm:gap-5"
          style={{ cursor: "pointer" }}
        >
          <div className="relative w-full sm:w-56 aspect-video sm:aspect-square flex-shrink-0 overflow-hidden">
            {post.cover_image_url ? (
              <Image src={post.cover_image_url} alt={post.title} fill sizes="(max-width: 640px) 100vw, 224px" className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(201,150,58,0.14), rgba(201,150,58,0.03))" }}>
                <span className="text-3xl opacity-40">✦</span>
              </div>
            )}
          </div>
          <div className="p-4 sm:p-5 flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <CategoryBadge category={post.category} />
              <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{formatDate(post.created_at)}</span>
            </div>
            <h3 className="text-base font-black mb-1.5 line-clamp-2" style={{ color: "var(--text-primary)" }}>{post.title}</h3>
            {post.excerpt && (
              <p className="text-sm leading-relaxed line-clamp-2" style={{ color: "var(--text-secondary)" }}>{post.excerpt}</p>
            )}
          </div>
        </button>
      </Reveal>
    );
  }

  // كارت شبكي (Grid) لصفحة المنشورات الكاملة
  return (
    <Reveal delay={delay}>
      <button onClick={() => onOpen(post.id)} className="w-full text-right card-pro rounded-2xl overflow-hidden h-full flex flex-col" style={{ cursor: "pointer" }}>
        <div className="relative aspect-video w-full overflow-hidden">
          {post.cover_image_url ? (
            <Image src={post.cover_image_url} alt={post.title} fill sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw" className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(201,150,58,0.14), rgba(201,150,58,0.03))" }}>
              <span className="text-4xl opacity-40">✦</span>
            </div>
          )}
          <span className="absolute top-3 right-3"><CategoryBadge category={post.category} /></span>
        </div>
        <div className="p-5 flex flex-col flex-1">
          <h3 className="text-base font-black mb-2 line-clamp-2" style={{ color: "var(--text-primary)" }}>{post.title}</h3>
          {post.excerpt && (
            <p className="text-sm leading-relaxed flex-1 line-clamp-3" style={{ color: "var(--text-secondary)" }}>{post.excerpt}</p>
          )}
          <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{formatDate(post.created_at)}</span>
            <span className="text-[11px] font-bold" style={{ color: GOLD }}>اقرأ المزيد ←</span>
          </div>
        </div>
      </button>
    </Reveal>
  );
}

// ---------------------------------------------------------------------------
// 1) قسم الصفحة الرئيسية: أحدث 5 منشورات بشكل فييد
// ---------------------------------------------------------------------------
export function PostsFeedSection({ onOpenPost, onViewAll }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetchPublished("sitePosts", { limit: 5 })
      .then((data) => { if (alive) setItems(data); })
      .catch(() => { if (alive) setItems([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  if (!loading && items.length === 0) return null; // مفيش داعي نعرض قسم فاضي في الرئيسية

  return (
    <section dir="rtl" className="px-6 md:px-10 py-16 md:py-20" style={{ background: "var(--bg-elevated)" }}>
      <div className="max-w-3xl mx-auto">
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
          <div className="flex flex-col gap-4">
            {items.map((p, i) => (
              <PostCard key={p.id} post={p} onOpen={onOpenPost} delay={i * 70} variant="feed" />
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
// 2) صفحة المنشورات الكاملة (Grid + فلترة بالتصنيف)
// ---------------------------------------------------------------------------
export function PostsGridPage({ onOpenPost }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    let alive = true;
    fetchPublished("sitePosts")
      .then((data) => { if (alive) setItems(data); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const filtered = items.filter((p) => filter === "all" || p.category === filter);
  const usedCategories = POST_CATEGORIES.filter((c) => items.some((p) => p.category === c.id));

  return (
    <div dir="rtl" className="min-h-screen px-6 py-28 relative">
      <div className="max-w-6xl mx-auto">
        <Reveal className="text-center mb-12 max-w-2xl mx-auto">
          <SectionLabel>OUR POSTS</SectionLabel>
          <h1 className="text-3xl md:text-5xl font-black tracking-wide mt-3 mb-4" style={{ fontFamily: "var(--font-cinzel), serif", color: "var(--text-primary)" }}>المنشورات</h1>
          <p className="text-sm md:text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            نصائح تسويقية، عروض وخصومات، أخبار وتحديثات، وأفكار جديدة — كل حاجة بتخص علامتك التجارية في مكان واحد.
          </p>
        </Reveal>

        {usedCategories.length > 0 && (
          <Reveal className="flex items-center justify-center gap-2 mb-10 flex-wrap">
            <button
              onClick={() => setFilter("all")}
              className="text-xs font-bold px-4 py-2 rounded-full transition"
              style={{
                border: `1px solid ${filter === "all" ? "var(--gold)" : "var(--border)"}`,
                background: filter === "all" ? "rgba(201,150,58,0.14)" : "transparent",
                color: filter === "all" ? "var(--gold-light)" : "var(--text-muted)",
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
                  border: `1px solid ${filter === c.id ? "var(--gold)" : "var(--border)"}`,
                  background: filter === c.id ? "rgba(201,150,58,0.14)" : "transparent",
                  color: filter === c.id ? "var(--gold-light)" : "var(--text-muted)",
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
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((p, i) => (
              <PostCard key={p.id} post={p} onOpen={onOpenPost} delay={i * 60} variant="grid" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3) صفحة المنشور المستقلة
// ---------------------------------------------------------------------------
export function PostDetailPage({ postId, onBack, onOpenPost }) {
  const [post, setPost] = useState(null);
  const [related, setRelated] = useState([]);
  const [allPosts, setAllPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setVisible(false);
    setNotFound(false);

    Promise.all([
      fetchPublishedContentById("sitePosts", postId),
      fetchPublished("sitePosts"),
    ])
      .then(([p, all]) => {
        if (!alive) return;
        setPost(p);
        setAllPosts(all);
        incrementContentViews("sitePosts", postId);
        return fetchRelatedContent("sitePosts", { category: p.category, excludeId: p.id, limit: 3 });
      })
      .then((rel) => { if (alive && rel) setRelated(rel); })
      .catch(() => { if (alive) setNotFound(true); })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
        requestAnimationFrame(() => setVisible(true));
      });

    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    return () => { alive = false; };
  }, [postId]);

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen px-6 py-28">
        <LoadingState />
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div dir="rtl" className="min-h-screen px-6 py-28 text-center">
        <EmptyState text="المنشور غير موجود أو تم حذفه." />
        <button onClick={onBack} className="btn-outline mt-4">الرجوع لكل المنشورات</button>
      </div>
    );
  }

  const idx = allPosts.findIndex((p) => p.id === post.id);
  const nextPost = idx > 0 ? allPosts[idx - 1] : null;   // الأحدث
  const prevPost = idx >= 0 && idx < allPosts.length - 1 ? allPosts[idx + 1] : null; // الأقدم
  const contentParagraphs = (post.content || "").split(/\n+/).filter(Boolean);

  return (
    <div
      dir="rtl"
      className="min-h-screen px-6 py-28"
      style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(10px)", transition: "opacity 0.35s ease, transform 0.35s ease" }}
    >
      <div className="max-w-3xl mx-auto">
        <button onClick={onBack} className="text-xs font-bold mb-8 inline-block" style={{ color: GOLD }}>→ كل المنشورات</button>

        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <CategoryBadge category={post.category} />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>{formatDate(post.created_at)}</span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>· {post.read_time_minutes || 3} دقايق قراءة</span>
        </div>

        <h1 className="text-2xl md:text-4xl font-black leading-snug mb-4" style={{ fontFamily: "var(--font-cinzel), serif", color: "var(--text-primary)" }}>
          {post.title}
        </h1>

        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black" style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD3})`, color: "#000" }}>
            {(post.author || "A")[0]}
          </div>
          <span className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>{post.author || "Abdullah Marketing"}</span>
        </div>

        {post.cover_image_url && (
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden mb-6">
            <Image src={post.cover_image_url} alt={post.title} fill sizes="(max-width: 768px) 100vw, 768px" className="object-cover" priority />
          </div>
        )}

        {post.caption && (
          <p className="text-xs mb-8 text-center" style={{ color: "var(--text-muted)" }}>{post.caption}</p>
        )}

        <div className="space-y-4 mb-10">
          {contentParagraphs.length > 0 ? (
            contentParagraphs.map((para, i) => (
              <p key={i} className="text-sm md:text-base leading-loose" style={{ color: "var(--text-secondary)" }}>{para}</p>
            ))
          ) : (
            post.excerpt && <p className="text-sm md:text-base leading-loose" style={{ color: "var(--text-secondary)" }}>{post.excerpt}</p>
          )}
        </div>

        {Array.isArray(post.gallery_urls) && post.gallery_urls.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-10">
            {post.gallery_urls.map((url, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden">
                <Image src={url} alt={`${post.title} ${i + 1}`} fill sizes="(max-width: 640px) 50vw, 33vw" className="object-cover" />
              </div>
            ))}
          </div>
        )}

        <div className="divider-gradient mb-6" />
        <ShareButtons title={post.title} />

        {/* المنشور السابق / التالي */}
        {(prevPost || nextPost) && (
          <div className="grid sm:grid-cols-2 gap-4 mt-10">
            {prevPost ? (
              <button onClick={() => onOpenPost(prevPost.id)} className="card-pro rounded-xl p-4 text-right" style={{ cursor: "pointer" }}>
                <span className="text-[11px] font-bold" style={{ color: GOLD }}>← المنشور السابق</span>
                <p className="text-sm font-bold mt-1 line-clamp-1" style={{ color: "var(--text-primary)" }}>{prevPost.title}</p>
              </button>
            ) : <div />}
            {nextPost ? (
              <button onClick={() => onOpenPost(nextPost.id)} className="card-pro rounded-xl p-4 text-left sm:text-right" style={{ cursor: "pointer" }}>
                <span className="text-[11px] font-bold" style={{ color: GOLD }}>المنشور التالي →</span>
                <p className="text-sm font-bold mt-1 line-clamp-1" style={{ color: "var(--text-primary)" }}>{nextPost.title}</p>
              </button>
            ) : <div />}
          </div>
        )}

        {/* منشورات مشابهة */}
        {related.length > 0 && (
          <div className="mt-16">
            <h3 className="text-lg font-black mb-5" style={{ color: "var(--text-primary)", fontFamily: "var(--font-cinzel), serif" }}>منشورات مشابهة</h3>
            <div className="grid sm:grid-cols-3 gap-5">
              {related.map((p, i) => (
                <PostCard key={p.id} post={p} onOpen={onOpenPost} delay={i * 60} variant="grid" />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
