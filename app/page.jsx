"use client";
import { useState, useEffect, useRef } from "react";

const GOLD = "#C9963A";
const GOLD2 = "#E8BE6A";
const GOLD3 = "#F5D78E";

function useReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
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
        transform: visible ? "translateY(0)" : "translateY(32px)",
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

function GoldText({ children, className = "" }) {
  return (
    <span
      className={className}
      style={{
        background: `linear-gradient(135deg, ${GOLD}, ${GOLD3}, ${GOLD})`,
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
      }}
    >
      {children}
    </span>
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

const services = [
  { icon: "🍽️", name: "تسويق المطاعم", desc: "استراتيجيات مخصصة للمطاعم والكافيهات — من التصوير الاحترافي للأكل حتى إدارة الحملات وزيادة الحجوزات.", tag: "RESTAURANT MARKETING" },
  { icon: "👗", name: "تسويق الأزياء والفاشن", desc: "هوية بصرية راقية لعلامات الأزياء وإدارتها على السوشيال ميديا بأسلوب يعكس الفخامة والتميز.", tag: "FASHION MARKETING" },
  { icon: "🎨", name: "تصميم المحتوى", desc: "تصاميم جرافيك احترافية لجميع المنصات — بوسترات، كروسيلات، ستوري، وهوية بصرية متكاملة.", tag: "DESIGNS" },
  { icon: "🎬", name: "إنتاج الريلز والفيديو", desc: "ريلز إبداعية ومونتاج احترافي يجذب الانتباه ويزيد الوصول — من السكريبت حتى النشر النهائي.", tag: "REELS" },
  { icon: "📈", name: "تنمية الأعمال رقمياً", desc: "خطط نمو شاملة تجمع إدارة الحسابات والإعلانات الممولة وتحليل البيانات لتحقيق أهدافك.", tag: "GROW YOUR BUSINESS" },
  { icon: "📱", name: "إدارة السوشيال ميديا", desc: "إدارة يومية متكاملة لحساباتك على إنستقرام وتيك توك وسناب شات — جدولة وتفاعل وتقارير شهرية.", tag: "SOCIAL MEDIA MANAGEMENT" },
];

const portfolioItems = [
  { cat: "social", emoji: "📱", name: "تصاميم إنستقرام — بوسترات ترويجية", desc: "بوسترات وكروسيلات احترافية بهوية بصرية موحدة.", tags: ["Instagram", "Canva Pro", "Photoshop"], bg: "linear-gradient(135deg,#1a0a2e,#16213e,#0f3460)" },
  { cat: "restaurant", emoji: "🍔", name: "تسويق مطعم برجر — قائمة وبوسترات", desc: "تصميم منيو رقمي وحملة سوشيال ميديا متكاملة.", tags: ["Facebook", "Menu Design", "Stories"], bg: "linear-gradient(135deg,#1a0800,#2d1200,#1a0800)" },
  { cat: "fashion", emoji: "👗", name: "هوية بصرية لماركة ملابس نسائية", desc: "هوية بصرية راقية ومتكاملة مع إدارة حسابات إنستقرام وتيك توك.", tags: ["Instagram", "TikTok", "Brand Identity"], bg: "linear-gradient(135deg,#0a0a0a,#1a1a1a)" },
  { cat: "reels", emoji: "🎬", name: "ريلز فيروسية — محتوى ترفيهي وترويجي", desc: "سكريبت ومونتاج ريلز قصيرة حققت وصولاً واسعاً.", tags: ["Reels", "TikTok", "CapCut"], bg: "linear-gradient(135deg,#0a0014,#14002a)" },
  { cat: "brand", emoji: "⭐", name: "هوية بصرية متكاملة — شعار وألوان", desc: "تصميم شعار وهوية بصرية كاملة لمشروع ناشئ.", tags: ["Logo", "Branding", "Illustrator"], bg: "linear-gradient(135deg,#001a0a,#002d12)" },
  { cat: "social", emoji: "📊", name: "إدارة حملات إعلانية — Facebook Ads", desc: "إدارة وتحسين حملات الإعلانات الممولة بتكلفة منخفضة.", tags: ["Facebook Ads", "Meta", "Analytics"], bg: "linear-gradient(135deg,#001226,#002040)" },
];

const tips = [
  { num: "01", icon: "🎯", title: "اعرف جمهورك قبل أي خطوة", body: "قبل ما تبدأ أي حملة، لازم تعرف مين بالضبط بتخاطبه — العمر، الاهتمامات، المشاكل. المحتوى المخصص بيوصل أكتر من ميزانية إعلانية كاملة.", tag: "AUDIENCE FIRST" },
  { num: "02", icon: "📅", title: "الانتظام أقوى من الجودة المتقطعة", body: "نشر محتوى متوسط بانتظام أفضل من محتوى ممتاز متقطع. الخوارزميات بتكافئ الحسابات النشطة. اعمل تقويم محتوى وإلتزم بيه.", tag: "CONSISTENCY" },
  { num: "03", icon: "📊", title: "اتابع الأرقام دايماً", body: "التسويق بدون تحليل زي القيادة بدون مرايا. راجع إنسايتس كل أسبوع — أكتر بوست نجح ليه نجح؟ الأرقام هي اللي بتقولك تحسن إيه.", tag: "DATA DRIVEN" },
  { num: "04", icon: "🎬", title: "الفيديو ملك المحتوى دلوقتي", body: "الريلز بتحقق وصولاً عضوياً أضعاف الصور. حتى فيديو بسيط بمحتوى قيّم هيوصل أكتر من تصميم فاخر. ابدأ بالريلز قبل أي شيء تاني.", tag: "VIDEO FIRST" },
  { num: "05", icon: "💬", title: "التفاعل مع الجمهور استثمار", body: "الرد على التعليقات والرسائل بسرعة مش مجرد أدب — ده بيخلي الخوارزمية تحب صفحتك وبيبني ثقة حقيقية مع متابعينك.", tag: "ENGAGEMENT" },
  { num: "06", icon: "🌟", title: "الهوية البصرية استثمار مش مصروف", body: "الهوية البصرية الواضحة بتوفر عليك وقت التصميم وبتخلي الجمهور يميزك فوراً وسط الزحام. ده استثمار بيرجع عليك أضعافه.", tag: "BRAND IDENTITY" },
];

const whyPoints = [
  { icon: "🎯", title: "نتائج حقيقية وقابلة للقياس", desc: "لا وعود فارغة — أهداف واضحة وتقارير شهرية تُثبت النمو الفعلي." },
  { icon: "⚡", title: "خبرة في أكثر من مجال", desc: "من المطاعم إلى الفاشن — فهم عميق لكل قطاع وجمهوره." },
  { icon: "🤝", title: "شراكة لا مجرد خدمة", desc: "نتعامل مع كل عميل كشريك استراتيجي ونبني معه الخطة خطوة بخطوة." },
  { icon: "✨", title: "محتوى يتميز وسط الزحام", desc: "نصنع ما يُوقف التمرير ويخلق انطباعاً لا يُنسى عن علامتك." },
];

const steps = [
  { n: "1", icon: "💬", title: "التواصل والفهم", desc: "نتعرف على علامتك وأهدافك وجمهورك المستهدف" },
  { n: "2", icon: "📋", title: "بناء الاستراتيجية", desc: "خطة محتوى مخصصة تناسب مجالك ومنصاتك" },
  { n: "3", icon: "🚀", title: "التنفيذ والنشر", desc: "تصميم، فيديو، كتابة، جدولة — كل شيء باحترافية" },
  { n: "4", icon: "📊", title: "التحليل والتطوير", desc: "نتابع النتائج ونحسّن الأداء باستمرار" },
];

// ─── PAGES ───────────────────────────────────────────────────────────────────

function HeroPage({ setPage }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setCount(c => (c + 1) % 100), 80);
    return () => clearInterval(t);
  }, []);

  return (
    <section
      dir="rtl"
      className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-28 pb-16 relative overflow-hidden"
      style={{ background: "#060606" }}
    >
      {/* Glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "8%", left: "50%", transform: "translateX(-50%)",
          width: 700, height: 500,
          background: "radial-gradient(ellipse, rgba(201,150,58,0.12) 0%, transparent 65%)",
        }}
      />
      {/* Bottom line */}
      <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />

      {/* Particles */}
      <Particles />

      {/* Eyebrow */}
      <div
        className="inline-flex items-center gap-2 text-xs font-bold tracking-widest mb-7 px-5 py-2 rounded-full border"
        style={{ color: GOLD, borderColor: "rgba(201,150,58,0.3)", animation: "fadeDown .8s ease forwards" }}
      >
        ✦ SOCIAL MEDIA MARKETING · أسيوط ✦
      </div>

      {/* Logo SVG */}
      <div className="mb-7" style={{ filter: "drop-shadow(0 0 40px rgba(201,150,58,0.35))", animation: "scaleIn 1s cubic-bezier(.16,1,.3,1) forwards" }}>
        <LogoSVG size={110} />
      </div>

      <h1
        className="font-black tracking-widest leading-none mb-2"
        style={{
          fontFamily: "'Cinzel', serif",
          fontSize: "clamp(40px,8vw,80px)",
          background: `linear-gradient(135deg, ${GOLD}, ${GOLD3}, ${GOLD})`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          animation: "fadeUp .9s .15s ease both",
        }}
      >
        ABDULLAH
      </h1>
      <h2
        className="tracking-widest mb-8 font-bold"
        style={{
          fontFamily: "'Cinzel', serif",
          fontSize: "clamp(12px,2vw,17px)",
          color: "#666",
          letterSpacing: 10,
          animation: "fadeUp .9s .25s ease both",
        }}
      >
        MARKETING
      </h2>
      <p
        className="text-base leading-relaxed max-w-lg mx-auto mb-10"
        style={{ color: "#999", animation: "fadeUp .9s .35s ease both" }}
      >
        نحوّل حضورك الرقمي إلى محرك نمو حقيقي — محتوى احترافي، إدارة ذكية، ونتائج تُقاس بالأرقام
      </p>

      <div className="flex gap-3 flex-wrap justify-center mb-16" style={{ animation: "fadeUp .9s .45s ease both" }}>
        <button
          onClick={() => setPage("contact")}
          className="font-black px-8 py-3 rounded-xl text-black text-sm transition-all duration-300 hover:-translate-y-1"
          style={{
            background: `linear-gradient(135deg, ${GOLD}, ${GOLD2})`,
            boxShadow: "0 4px 30px rgba(201,150,58,0.3)",
          }}
        >
          🚀 ابدأ رحلتك معنا
        </button>
        <a
          href="#services"
          className="font-bold px-8 py-3 rounded-xl text-sm transition-all duration-300 border hover:bg-yellow-900/10"
          style={{ color: GOLD, borderColor: "rgba(201,150,58,0.4)" }}
        >
          اكتشف الخدمات
        </a>
      </div>

      {/* Stats */}
      <div
        className="flex flex-wrap justify-center border-t border-b w-full max-w-2xl"
        style={{ borderColor: "#2A2A2A", animation: "fadeUp .9s .55s ease both" }}
      >
        {[
          { num: "+500", label: "عميل راضٍ" },
          { num: "+3X", label: "متوسط نمو التفاعل" },
          { num: "6", label: "خدمات متخصصة" },
          { num: "24/7", label: "دعم مستمر" },
        ].map((s, i) => (
          <div
            key={i}
            className="flex-1 py-5 px-6 text-center"
            style={{ borderLeft: i < 3 ? "1px solid #2A2A2A" : "none", minWidth: 120 }}
          >
            <span
              className="block text-2xl font-black mb-1"
              style={{ fontFamily: "'Cinzel', serif", color: GOLD }}
            >{s.num}</span>
            <span className="text-xs tracking-wider font-semibold" style={{ color: "#666" }}>{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Particles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 18 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: 1.5 + Math.random() * 2,
            height: 1.5 + Math.random() * 2,
            left: `${Math.random() * 100}%`,
            background: GOLD,
            animation: `floatUp ${8 + Math.random() * 14}s linear ${Math.random() * 10}s infinite`,
            opacity: 0,
          }}
        />
      ))}
    </div>
  );
}

function LogoSVG({ size = 80 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 130 130" fill="none">
      <defs>
        <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C9963A" />
          <stop offset="50%" stopColor="#F5D78E" />
          <stop offset="100%" stopColor="#C9963A" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <polygon points="65,12 98,95 83,95 65,48 47,95 32,95" fill="url(#g1)" filter="url(#glow)" />
      <rect x="48" y="69" width="34" height="7" rx="2" fill="url(#g1)" />
      <path d="M33 103 Q65 84 97 103" stroke="url(#g1)" strokeWidth="3" fill="none" strokeLinecap="round" />
      <polygon points="97,99 106,106 90,108" fill="url(#g1)" />
    </svg>
  );
}

function ServicesSection() {
  return (
    <section id="services" dir="rtl" className="py-24 px-6 md:px-10" style={{ background: "#0E0E0E" }}>
      <Reveal className="text-center mb-14">
        <SectionLabel>OUR SERVICES</SectionLabel>
        <h2 className="text-3xl md:text-4xl font-black tracking-wide mb-3 text-white" style={{ fontFamily: "'Cinzel', serif" }}>
          خدماتنا الاحترافية
        </h2>
        <p className="text-sm text-gray-500 leading-relaxed max-w-md mx-auto">
          حلول متكاملة تحوّل علامتك التجارية إلى قوة رقمية لا تُنافَس
        </p>
      </Reveal>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
        {services.map((s, i) => (
          <Reveal key={i} delay={i * 80}>
            <div
              className="rounded-2xl p-8 border relative overflow-hidden group cursor-default transition-all duration-300 hover:-translate-y-1"
              style={{
                background: "#161616",
                borderColor: "#2A2A2A",
                boxShadow: "0 0 0 transparent",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = "rgba(201,150,58,0.35)";
                e.currentTarget.style.boxShadow = "0 20px 60px rgba(0,0,0,0.5)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = "#2A2A2A";
                e.currentTarget.style.boxShadow = "0 0 0 transparent";
              }}
            >
              {/* top gold line */}
              <div
                className="absolute top-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }}
              />
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-xl mb-5 transition-all duration-300 group-hover:scale-110"
                style={{ background: "rgba(201,150,58,0.08)", border: "1px solid rgba(201,150,58,0.2)" }}
              >
                {s.icon}
              </div>
              <h3 className="text-base font-bold text-white mb-2">{s.name}</h3>
              <p className="text-xs leading-relaxed" style={{ color: "#666" }}>{s.desc}</p>
              <span
                className="inline-block mt-4 text-xs font-bold tracking-wider px-3 py-1 rounded-full"
                style={{ color: GOLD, background: "rgba(201,150,58,0.08)", border: "1px solid rgba(201,150,58,0.2)" }}
              >{s.tag}</span>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function PortfolioSection() {
  const [filter, setFilter] = useState("all");
  const [lightbox, setLightbox] = useState(null);

  const filters = [
    { k: "all", label: "الكل" },
    { k: "social", label: "سوشيال ميديا" },
    { k: "restaurant", label: "مطاعم" },
    { k: "fashion", label: "فاشن" },
    { k: "reels", label: "ريلز" },
    { k: "brand", label: "هوية بصرية" },
  ];

  const visible = filter === "all" ? portfolioItems : portfolioItems.filter(p => p.cat === filter);

  return (
    <section id="portfolio" dir="rtl" className="py-24 px-6 md:px-10" style={{ background: "#060606" }}>
      <Reveal className="text-center mb-8">
        <SectionLabel>MY WORK</SectionLabel>
        <h2 className="text-3xl md:text-4xl font-black tracking-wide mb-3 text-white" style={{ fontFamily: "'Cinzel', serif" }}>
          أعمالي وتصاميمي
        </h2>
        <p className="text-sm text-gray-500 leading-relaxed max-w-md mx-auto">
          نماذج من التصاميم والمحتوى الذي أنتجته لعملاء في مجالات مختلفة
        </p>
      </Reveal>

      {/* Filters */}
      <div className="flex flex-wrap justify-center gap-2 mb-12">
        {filters.map(f => (
          <button
            key={f.k}
            onClick={() => setFilter(f.k)}
            className="px-5 py-2 rounded-full text-xs font-bold tracking-wider border transition-all duration-200"
            style={{
              background: filter === f.k ? "rgba(201,150,58,0.12)" : "transparent",
              borderColor: filter === f.k ? GOLD : "#2A2A2A",
              color: filter === f.k ? GOLD : "#666",
            }}
          >{f.label}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
        {visible.map((item, i) => (
          <div
            key={i}
            onClick={() => setLightbox(item)}
            className="rounded-2xl border overflow-hidden cursor-pointer group transition-all duration-300 hover:-translate-y-2"
            style={{
              background: "#161616",
              borderColor: "#2A2A2A",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "rgba(201,150,58,0.35)";
              e.currentTarget.style.boxShadow = "0 24px 70px rgba(0,0,0,0.6)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "#2A2A2A";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            {/* Thumb */}
            <div className="relative h-52 flex items-center justify-center overflow-hidden" style={{ background: item.bg }}>
              <span className="text-6xl transition-transform duration-500 group-hover:scale-110">{item.emoji}</span>
              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-2xl scale-50 group-hover:scale-100 transition-transform duration-300"
                  style={{ background: GOLD }}
                >👁️</div>
              </div>
            </div>
            <div className="p-5">
              <div className="text-xs font-bold tracking-widest mb-1" style={{ color: GOLD }}>
                {item.cat.toUpperCase()}
              </div>
              <h3 className="text-sm font-bold text-white mb-1">{item.name}</h3>
              <p className="text-xs leading-relaxed mb-3" style={{ color: "#666" }}>{item.desc}</p>
              <div className="flex flex-wrap gap-1">
                {item.tags.map((t, j) => (
                  <span key={j} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(201,150,58,0.07)", border: "1px solid rgba(201,150,58,0.2)", color: "#888" }}>{t}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          style={{ background: "rgba(0,0,0,0.92)" }}
          onClick={() => setLightbox(null)}
        >
          <div
            className="rounded-3xl p-8 max-w-lg w-full relative"
            style={{ background: "#161616", border: "1px solid rgba(201,150,58,0.2)" }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setLightbox(null)}
              className="absolute top-4 left-4 w-9 h-9 rounded-full flex items-center justify-center text-lg transition-colors"
              style={{ background: "rgba(201,150,58,0.1)", border: "1px solid rgba(201,150,58,0.2)", color: GOLD }}
            >✕</button>
            <div
              className="w-full h-52 rounded-2xl mb-6 flex items-center justify-center text-7xl"
              style={{ background: lightbox.bg }}
            >{lightbox.emoji}</div>
            <div className="text-xs font-bold tracking-widest mb-2" style={{ color: GOLD }}>{lightbox.cat.toUpperCase()}</div>
            <h3 className="text-xl font-bold text-white mb-2">{lightbox.name}</h3>
            <p className="text-sm leading-relaxed" style={{ color: "#888" }}>{lightbox.desc}</p>
          </div>
        </div>
      )}
    </section>
  );
}

function TipsSection() {
  return (
    <section id="tips" dir="rtl" className="py-24 px-6 md:px-10" style={{ background: "#0E0E0E" }}>
      <Reveal className="text-center mb-14">
        <SectionLabel>TIPS & INSIGHTS</SectionLabel>
        <h2 className="text-3xl md:text-4xl font-black tracking-wide mb-3 text-white" style={{ fontFamily: "'Cinzel', serif" }}>
          نصائح للمشاريع
        </h2>
        <p className="text-sm text-gray-500 leading-relaxed max-w-md mx-auto">
          خلاصة تجربتي — نصائح عملية تساعدك تنمو رقمياً بشكل أسرع وأذكى
        </p>
      </Reveal>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {tips.map((t, i) => (
          <Reveal key={i} delay={i * 60}>
            <div
              className="rounded-2xl p-8 border relative overflow-hidden transition-all duration-300 group hover:-translate-y-1"
              style={{ background: "#161616", borderColor: "#2A2A2A" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(201,150,58,0.25)"; e.currentTarget.style.boxShadow = "0 20px 60px rgba(0,0,0,.4)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#2A2A2A"; e.currentTarget.style.boxShadow = "none"; }}
            >
              {/* Bottom gold line */}
              <div
                className="absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }}
              />
              <span
                className="absolute top-4 left-5 text-5xl font-black leading-none pointer-events-none select-none"
                style={{
                  fontFamily: "'Cinzel', serif",
                  background: "linear-gradient(135deg, rgba(201,150,58,0.18), rgba(201,150,58,0.05))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >{t.num}</span>
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-xl mb-4 relative z-10"
                style={{ background: "rgba(201,150,58,0.08)", border: "1px solid rgba(201,150,58,0.2)" }}
              >{t.icon}</div>
              <h3 className="text-sm font-bold text-white mb-2 relative z-10">{t.title}</h3>
              <p className="text-xs leading-relaxed relative z-10" style={{ color: "#666" }}>{t.body}</p>
              <span
                className="inline-block mt-4 text-xs font-bold tracking-wider px-3 py-1 rounded-full relative z-10"
                style={{ color: GOLD, background: "rgba(201,150,58,0.07)", border: "1px solid rgba(201,150,58,0.18)" }}
              >{t.tag}</span>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function WhySection() {
  return (
    <section id="why" dir="rtl" className="py-24 px-6 md:px-16" style={{ background: "#060606" }}>
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-16">
        {/* Visual */}
        <Reveal className="flex-shrink-0">
          <div className="relative w-52 h-52 flex items-center justify-center">
            <div
              className="absolute inset-0 rounded-full border-2 animate-spin-slow"
              style={{ borderColor: "rgba(201,150,58,0.15)", animationDuration: "20s" }}
            />
            <div
              className="absolute rounded-full border"
              style={{ inset: 20, borderColor: "rgba(201,150,58,0.08)" }}
            />
            <div className="relative z-10 text-center">
              <div
                className="text-6xl font-black"
                style={{
                  fontFamily: "'Cinzel', serif",
                  background: `linear-gradient(135deg, ${GOLD}, ${GOLD3})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >A</div>
              <div className="text-xs tracking-widest font-bold" style={{ color: "#555", letterSpacing: 3 }}>MARKETING</div>
            </div>
          </div>
        </Reveal>

        <div>
          <Reveal>
            <SectionLabel>WHY US</SectionLabel>
            <h2 className="text-3xl md:text-4xl font-black tracking-wide mb-8 text-white" style={{ fontFamily: "'Cinzel', serif" }}>
              لماذا تختار Abdullah Marketing؟
            </h2>
          </Reveal>
          <div className="space-y-6">
            {whyPoints.map((p, i) => (
              <Reveal key={i} delay={i * 100}>
                <div className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ background: "rgba(201,150,58,0.1)", border: "1px solid rgba(201,150,58,0.2)" }}
                  >{p.icon}</div>
                  <div>
                    <h4 className="font-bold text-white mb-1 text-sm">{p.title}</h4>
                    <p className="text-xs leading-relaxed" style={{ color: "#666" }}>{p.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProcessSection() {
  return (
    <section id="process" dir="rtl" className="py-24 px-6 md:px-10" style={{ background: "#0E0E0E" }}>
      <Reveal className="text-center mb-16">
        <SectionLabel>HOW WE WORK</SectionLabel>
        <h2 className="text-3xl md:text-4xl font-black tracking-wide mb-3 text-white" style={{ fontFamily: "'Cinzel', serif" }}>
          آلية العمل
        </h2>
        <p className="text-sm text-gray-500">أربع خطوات من التواصل الأول حتى النتائج</p>
      </Reveal>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto relative">
        {/* Connector line */}
        <div
          className="absolute hidden md:block"
          style={{ top: 38, right: "10%", left: "10%", height: 1, background: "linear-gradient(90deg,transparent,#2A2A2A,#2A2A2A,transparent)" }}
        />
        {steps.map((s, i) => (
          <Reveal key={i} delay={i * 100}>
            <div className="text-center group">
              <div
                className="relative w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center text-2xl transition-all duration-300 group-hover:scale-105"
                style={{ background: "#161616", border: "1px solid #2A2A2A" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = GOLD; e.currentTarget.style.background = "rgba(201,150,58,0.07)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#2A2A2A"; e.currentTarget.style.background = "#161616"; }}
              >
                <span className="text-2xl">{s.icon}</span>
                <span
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black"
                  style={{ background: GOLD, color: "#000", fontFamily: "'Cinzel', serif" }}
                >{s.n}</span>
              </div>
              <h4 className="text-sm font-bold text-white mb-2">{s.title}</h4>
              <p className="text-xs leading-relaxed" style={{ color: "#666" }}>{s.desc}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function AboutPage({ setPage }) {
  const details = [
    { icon: "📍", label: "LOCATION", value: "أسيوط، مصر" },
    { icon: "🎯", label: "SPECIALTY", value: "Social Media Marketing" },
    { icon: "📚", label: "STATUS", value: "متعلم ومتطور باستمرار" },
    { icon: "🌍", label: "SERVING", value: "أسيوط والمناطق المجاورة" },
    { icon: "⚡", label: "FOCUS", value: "مطاعم · فاشن · أعمال" },
  ];

  return (
    <div dir="rtl" style={{ background: "#060606", minHeight: "100vh" }}>
      {/* Hero */}
      <div
        className="text-center px-6 pt-36 pb-20 relative overflow-hidden"
        style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #060606 100%)" }}
      >
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ width: 600, height: 400, background: "radial-gradient(ellipse, rgba(201,150,58,0.08) 0%, transparent 65%)" }}
        />
        {/* Avatar */}
        <div
          className="w-28 h-28 rounded-full mx-auto mb-6 flex items-center justify-center text-5xl relative"
          style={{
            background: "linear-gradient(135deg, rgba(201,150,58,0.2), rgba(201,150,58,0.05))",
            border: `2px solid ${GOLD}`,
            boxShadow: "0 0 40px rgba(201,150,58,0.2)",
          }}
        >👤</div>
        <h1
          className="text-3xl md:text-4xl font-black tracking-widest mb-1"
          style={{ fontFamily: "'Cinzel', serif", color: GOLD }}
        >ABDULLAH DIAA</h1>
        <p className="text-sm tracking-widest font-bold mb-3" style={{ color: "#555", letterSpacing: 4 }}>
          SOCIAL MEDIA MARKETING SPECIALIST
        </p>
        <p className="text-sm" style={{ color: "#666" }}>📍 أسيوط، مصر</p>

        {/* Instagram personal link */}
        <a
          href="https://www.instagram.com/3bdullah.dyaa?igsh=MTFnMDM4NHUxemc3cQ=="
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 mt-5 px-5 py-2 rounded-full text-sm font-bold transition-all duration-300 hover:scale-105"
          style={{
            background: "linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)",
            color: "#fff",
            boxShadow: "0 4px 20px rgba(131,58,180,0.3)",
          }}
        >
          📸 تابعني على إنستقرام @3bdullah.dyaa
        </a>
      </div>

      {/* Body */}
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
          {/* Bio */}
          <Reveal>
            <div
              className="rounded-2xl p-8 border"
              style={{ background: "#0E0E0E", borderColor: "#2A2A2A" }}
            >
              <div className="flex items-center gap-2 mb-5 text-xs font-bold tracking-widest" style={{ color: GOLD }}>
                ✦ من أنا
              </div>
              <p className="text-sm leading-loose mb-4" style={{ color: "#bbb" }}>
                أنا <strong className="text-white">عبدالله ضياء الدين</strong>، متخصص في التسويق عبر منصات السوشيال ميديا من أسيوط، مصر. عمري ٢٠ سنة وبدأت رحلتي في عالم الماركتنج بشغف حقيقي وإرادة قوية للتعلم والتطور.
              </p>
              <p className="text-sm leading-loose mb-4" style={{ color: "#bbb" }}>
                بؤمن إن <strong className="text-white">البداية الصح</strong> هي أقوى خطوة — وأنا بنيت مهاراتي على أساس متين من التعلم العملي والتطبيق الفعلي.
              </p>
              <p className="text-sm leading-loose" style={{ color: "#bbb" }}>
                رحلتي لسه في بدايتها، بس <strong className="text-white">الطموح كبير والهدف واضح:</strong> أكون مرجعاً موثوقاً لأصحاب الأعمال في منطقتنا.
              </p>
            </div>
          </Reveal>

          {/* Details */}
          <Reveal delay={100}>
            <div className="space-y-3">
              {details.map((d, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-4 rounded-xl border"
                  style={{ background: "#0E0E0E", borderColor: "#2A2A2A" }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                    style={{ background: "rgba(201,150,58,0.1)", border: "1px solid rgba(201,150,58,0.2)" }}
                  >{d.icon}</div>
                  <div>
                    <span className="block text-xs font-bold tracking-widest mb-0.5" style={{ color: "#555" }}>{d.label}</span>
                    <strong className="text-sm text-white font-bold">{d.value}</strong>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        {/* Vision */}
        <Reveal>
          <div
            className="rounded-2xl p-8 border mb-10"
            style={{
              background: "linear-gradient(135deg, rgba(201,150,58,0.06), rgba(201,150,58,0.02))",
              borderColor: "rgba(201,150,58,0.2)",
            }}
          >
            <h3 className="text-lg font-black text-white mb-3" style={{ fontFamily: "'Cinzel', serif" }}>🌟 رؤيتي</h3>
            <p className="text-sm leading-loose" style={{ color: "#888" }}>
              أؤمن أن كل مشروع صغير يستحق حضوراً رقمياً احترافياً — هدفي إن كل صاحب عمل في أسيوط يلاقي في Abdullah Marketing الشريك الموثوق اللي يساعده ينمو ويوصل لجمهوره الصح بأقل تكلفة وأعلى تأثير.
            </p>
          </div>
        </Reveal>

        <div className="text-center">
          <button
            onClick={() => setPage("contact")}
            className="font-black px-10 py-4 rounded-xl text-black text-sm transition-all duration-300 hover:-translate-y-1"
            style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD2})`, boxShadow: "0 4px 30px rgba(201,150,58,0.3)" }}
          >
            تواصل معي الآن 🚀
          </button>
        </div>
      </div>
    </div>
  );
}

function ContactPage() {
  const contacts = [
    { href: "https://whatsapp.com/channel/0029VaeMlI8BvvsZa78iBd1W", icon: "📲", label: "WHATSAPP CHANNEL", name: "قناة الواتساب الرسمية", colorBg: "rgba(37,211,102,0.1)" },
    { href: "https://www.facebook.com/share/1DwbCov7zr/", icon: "📘", label: "FACEBOOK PAGE", name: "صفحة فيسبوك الرسمية", colorBg: "rgba(24,119,242,0.1)" },
    { href: "https://www.instagram.com/3bdullah.marketing?igsh=MTEzMXFiZTh2cG81cQ==", icon: "📸", label: "INSTAGRAM BUSINESS", name: "@3bdullah.marketing", colorBg: "rgba(228,64,95,0.1)" },
    { href: "https://www.instagram.com/3bdullah.dyaa?igsh=MTFnMDM4NHUxemc3cQ==", icon: "🌟", label: "INSTAGRAM PERSONAL", name: "@3bdullah.dyaa", colorBg: "rgba(201,150,58,0.1)" },
  ];

  return (
    <div dir="rtl" className="min-h-screen flex items-center py-24 px-6" style={{ background: "#0E0E0E" }}>
      <div className="max-w-lg mx-auto w-full">
        <Reveal className="text-center mb-12">
          <SectionLabel>CONTACT US</SectionLabel>
          <h2 className="text-3xl md:text-4xl font-black tracking-wide mb-3 text-white" style={{ fontFamily: "'Cinzel', serif" }}>
            تواصل معنا الآن
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            جاهزون للرد عليك في أي وقت — اختر القناة الأنسب لك وابدأ رحلة النمو الرقمي اليوم
          </p>
        </Reveal>

        <div className="space-y-3 mb-10">
          {contacts.map((c, i) => (
            <Reveal key={i} delay={i * 80}>
              <a
                href={c.href}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-4 p-5 rounded-2xl border transition-all duration-300 hover:-translate-x-1 group relative overflow-hidden"
                style={{ background: "#161616", borderColor: "#2A2A2A" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(201,150,58,0.3)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#2A2A2A"; }}
              >
                <div
                  className="absolute right-0 top-0 bottom-0 w-1 scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-center"
                  style={{ background: GOLD }}
                />
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: c.colorBg }}
                >{c.icon}</div>
                <div className="flex-1 text-right">
                  <span className="block text-xs font-bold tracking-wider mb-0.5" style={{ color: "#555" }}>{c.label}</span>
                  <strong className="text-sm font-bold text-white">{c.name}</strong>
                </div>
                <span style={{ color: "#555" }}>←</span>
              </a>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <div
            className="rounded-2xl p-8 text-center border"
            style={{
              background: "linear-gradient(135deg, rgba(201,150,58,0.08), rgba(201,150,58,0.03))",
              borderColor: "rgba(201,150,58,0.2)",
            }}
          >
            <h3 className="text-xl font-black text-white mb-2" style={{ fontFamily: "'Cinzel', serif" }}>مستعد تنمو رقمياً؟</h3>
            <p className="text-sm leading-relaxed mb-6" style={{ color: "#777" }}>
              تواصل معنا اليوم واحصل على استشارة مجانية لحسابك على السوشيال ميديا
            </p>
            <a
              href="https://whatsapp.com/channel/0029VaeMlI8BvvsZa78iBd1W"
              target="_blank"
              rel="noreferrer"
              className="inline-block font-black px-8 py-3 rounded-xl text-black text-sm transition-all duration-300 hover:-translate-y-1"
              style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD2})`, boxShadow: "0 4px 30px rgba(201,150,58,0.3)" }}
            >
              ابدأ الآن مجاناً 🚀
            </a>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

// ─── NAV ─────────────────────────────────────────────────────────────────────

function Navbar({ page, setPage }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const links = [
    { id: "home", label: "الرئيسية" },
    { id: "services-anchor", label: "الخدمات" },
    { id: "portfolio-anchor", label: "أعمالي" },
    { id: "tips-anchor", label: "نصائح" },
    { id: "about", label: "من نحن" },
    { id: "contact", label: "تواصل معنا" },
  ];

  const handleNav = (id) => {
    setMenuOpen(false);
    if (id === "about" || id === "contact") {
      setPage(id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (id === "home") {
      setPage("home");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setPage("home");
      setTimeout(() => {
        const el = document.getElementById(id.replace("-anchor", ""));
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 80);
    }
  };

  return (
    <>
      <nav
        dir="rtl"
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-10 py-4 transition-all duration-300"
        style={{
          background: "rgba(6,6,6,0.92)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(201,150,58,0.12)",
          boxShadow: scrolled ? "0 4px 40px rgba(0,0,0,0.7)" : "none",
        }}
      >
        <button
          onClick={() => handleNav("home")}
          className="font-black tracking-widest text-sm transition-opacity hover:opacity-80"
          style={{
            fontFamily: "'Cinzel', serif",
            background: `linear-gradient(135deg, ${GOLD}, ${GOLD3}, ${GOLD})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >ABDULLAH</button>

        {/* Desktop Links */}
        <ul className="hidden md:flex gap-6 list-none">
          {links.map(l => (
            <li key={l.id}>
              <button
                onClick={() => handleNav(l.id)}
                className="text-xs font-semibold tracking-wider transition-colors duration-200 relative group pb-1"
                style={{ color: "#666" }}
                onMouseEnter={e => { e.currentTarget.style.color = GOLD; }}
                onMouseLeave={e => { e.currentTarget.style.color = "#666"; }}
              >
                {l.label}
                <span
                  className="absolute bottom-0 right-0 h-px transition-all duration-300 group-hover:w-full"
                  style={{ width: 0, background: GOLD }}
                />
              </button>
            </li>
          ))}
        </ul>

        <button
          onClick={() => handleNav("contact")}
          className="hidden md:block font-bold text-xs px-5 py-2 rounded-lg transition-all duration-200 hover:opacity-90 hover:-translate-y-0.5"
          style={{ background: GOLD, color: "#000" }}
        >ابدأ معنا</button>

        {/* Mobile Toggle */}
        <button
          className="md:hidden text-xl"
          style={{ color: GOLD, background: "none", border: "none" }}
          onClick={() => setMenuOpen(m => !m)}
        >{menuOpen ? "✕" : "☰"}</button>
      </nav>

      {/* Mobile Menu */}
      {menuOpen && (
        <div
          dir="rtl"
          className="fixed top-14 left-0 right-0 z-40 py-4 border-b"
          style={{ background: "rgba(6,6,6,0.98)", backdropFilter: "blur(20px)", borderColor: "#2A2A2A" }}
        >
          {links.map(l => (
            <button
              key={l.id}
              onClick={() => handleNav(l.id)}
              className="block w-full text-right px-6 py-3 text-sm font-semibold transition-colors"
              style={{ color: "#888" }}
              onMouseEnter={e => { e.currentTarget.style.color = GOLD; }}
              onMouseLeave={e => { e.currentTarget.style.color = "#888"; }}
            >{l.label}</button>
          ))}
        </div>
      )}
    </>
  );
}

function Footer({ setPage }) {
  return (
    <footer
      dir="rtl"
      className="flex items-center justify-between flex-wrap gap-4 px-6 md:px-10 py-8 border-t"
      style={{ background: "#0E0E0E", borderColor: "#2A2A2A" }}
    >
      <span
        className="font-black tracking-widest text-sm"
        style={{ fontFamily: "'Cinzel', serif", color: GOLD }}
      >ABDULLAH MARKETING</span>
      <span className="text-xs" style={{ color: "#555" }}>© 2025 Abdullah Marketing · أسيوط، مصر</span>
      <div className="flex gap-2">
        {[
          { href: "https://www.instagram.com/3bdullah.dyaa?igsh=MTFnMDM4NHUxemc3cQ==", icon: "📸", title: "Instagram Personal" },
          { href: "https://www.instagram.com/3bdullah.marketing?igsh=MTEzMXFiZTh2cG81cQ==", icon: "📷", title: "Instagram Business" },
          { href: "https://www.facebook.com/share/1DwbCov7zr/", icon: "📘", title: "Facebook" },
          { href: "https://whatsapp.com/channel/0029VaeMlI8BvvsZa78iBd1W", icon: "📲", title: "WhatsApp" },
        ].map((s, i) => (
          <a
            key={i}
            href={s.href}
            target="_blank"
            rel="noreferrer"
            title={s.title}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-base transition-all duration-200 hover:-translate-y-0.5"
            style={{ background: "#161616", border: "1px solid #2A2A2A" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = GOLD; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#2A2A2A"; }}
          >{s.icon}</a>
        ))}
      </div>
    </footer>
  );
}

// ─── APP ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [page, setPage] = useState("home");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&family=Cinzel:wght@700;900&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Cairo', sans-serif; background: #060606; overflow-x: hidden; }
        @keyframes floatUp {
          0% { opacity: 0; transform: translateY(100vh); }
          10% { opacity: 0.6; }
          90% { opacity: 0.2; }
          100% { opacity: 0; transform: translateY(-20px); }
        }
        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes spin-slow {
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow { animation: spin-slow 20s linear infinite; }
      `}</style>

      <Navbar page={page} setPage={setPage} />

      {page === "home" && (
        <>
          <HeroPage setPage={setPage} />
          <ServicesSection />
          <PortfolioSection />
          <TipsSection />
          <WhySection />
          <ProcessSection />
        </>
      )}
      {page === "about" && <AboutPage setPage={setPage} />}
      {page === "contact" && <ContactPage />}

      <Footer setPage={setPage} />
    </>
  );
}
