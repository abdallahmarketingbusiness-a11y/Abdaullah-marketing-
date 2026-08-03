"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { createPackage } from "../services/packagesService";
import Toast from "../components/Toast";
import PackagesGallery from "../components/PackagesGallery";
import PackageDetails from "../components/PackageDetails";
import PortfolioGallery from "../components/PortfolioGallery";
import {
  fetchPortfolioItems,
  fetchDistinctCategories,
  incrementViews,
  logDesignRequest,
  buildWhatsappOrderMessage,
} from "../services/portfolioService";
import { isCurrentUserAdmin, signOutAdmin, getCurrentSession } from "../services/authService";
import { fetchVisibleTestimonials } from "../services/testimonialsService";
import AnnouncementBar from "../components/AnnouncementBar";
import { getCurrentClientSession, onClientAuthStateChange, signOutClient } from "../services/clientAuthService";
import { fetchPublished } from "../services/contentService";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  subscribeToClientNotifications,
} from "../services/clientPortalService";
import { NOTIF_ICONS } from "../lib/notificationIcons";
import { PostsFeedSection, PostsGridPage, PostDetailPage } from "../components/PostsHub";
import MarketingChatWidget from "../components/MarketingChatWidget";

// تحميل كسول (code-splitting) لصفحات الأدمن ولوحة العميل وتسجيل الدخول/الاشتراك.
// الصفحات دي كلها موجودة خلف رابط hash مخصص (#admin, #dashboard, #login...)
// وميظهروش أبدًا في الصفحة الرئيسية — فمفيش داعي إن الزائر العادي يحمّل
// الكود بتاعهم (لوحة الأدمن لوحدها فيها آلاف الأسطر) وهو بس بيتصفح الموقع.
// ده بيقلل حجم الـ JS اللي بيتحمّل أول ما حد يفتح الموقع، وده اللي بيسبب
// الإحساس بالبطء/اللاج على الأجهزة الأضعف — من غير أي تغيير في الشكل نفسه.
const AdminLogin = dynamic(() => import("../components/AdminLogin"));
const AdminDashboard = dynamic(() => import("../components/AdminDashboard"));
const ClientLogin = dynamic(() => import("../components/ClientLogin"));
const ClientSignup = dynamic(() => import("../components/ClientSignup"));
const ClientForgotPassword = dynamic(() => import("../components/ClientForgotPassword"));
const ClientResetPassword = dynamic(() => import("../components/ClientResetPassword"));
const ClientDashboard = dynamic(() => import("../components/ClientDashboard"));
const SubscribeModal = dynamic(() => import("../components/SubscribeModal"));

const GOLD = "#C9963A";
const GOLD2 = "#E8BE6A";
const GOLD3 = "#F5D78E";
const IMG_LOGO = "/logo.png";
const IMG_AVATAR = "/avatar.jpg";
const WA_LINK = "https://wa.me/201069032563?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%20%D8%A3%D8%B1%D9%8A%D8%AF%20%D8%A7%D9%84%D8%A7%D8%B3%D8%AA%D9%81%D8%B3%D8%A7%D8%B1%20%D8%B9%D9%86%20%D8%AE%D8%AF%D9%85%D8%A7%D8%AA%D9%83";
const IMG_OG = "/images/og-image-meta.jpg";

const IMG_NUTELLA = "/images/nutella.jpg";
const IMG_BURGER_FIRE = "/images/burger-fire.jpg";
const IMG_BUMBLE = "/images/bumble.jpg";
const IMG_BURGER_OFFER = "/images/burger-offer.jpg";
const IMG_SCIB = "/images/scib.jpg";

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
    <div ref={ref} className={className} style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(14px)", transition: `opacity 0.32s ease-out ${delay}ms, transform 0.32s ease-out ${delay}ms` }}>
      {children}
    </div>
  );
}

function GoldText({ children, className = "" }) {
  return (
    <span className={className} style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD3}, ${GOLD})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
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

// WhatsApp floating button
function WAButton() {
  return (
    <a
      href={WA_LINK}
      target="_blank"
      rel="noreferrer"
      title="تواصل عبر واتساب"
      style={{
        position: "fixed", bottom: 24, left: 24, zIndex: 9999,
        width: 58, height: 58, borderRadius: "50%",
        background: "linear-gradient(135deg,#25D366,#128C7E)",
        boxShadow: "0 4px 24px rgba(37,211,102,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 28, textDecoration: "none",
        animation: "waPulse 2.5s ease-in-out infinite",
      }}
    >
      💬
    </a>
  );
}

const legacyServices = [
  { icon: "🍽️", name: "تسويق المطاعم", desc: "استراتيجيات مخصصة للمطاعم والكافيهات — من التصوير الاحترافي للأكل حتى إدارة الحملات وزيادة الحجوزات.", tag: "RESTAURANT MARKETING" },
  { icon: "👗", name: "تسويق الأزياء والفاشن", desc: "هوية بصرية راقية لعلامات الأزياء وإدارتها على السوشيال ميديا بأسلوب يعكس الفخامة والتميز.", tag: "FASHION MARKETING" },
  { icon: "🎨", name: "تصميم المحتوى", desc: "تصاميم جرافيك احترافية لجميع المنصات — بوسترات، كروسيلات، ستوري، وهوية بصرية متكاملة.", tag: "DESIGNS" },
  { icon: "🎬", name: "إنتاج الريلز والفيديو", desc: "ريلز إبداعية ومونتاج احترافي يجذب الانتباه ويزيد الوصول — من السكريبت حتى النشر النهائي.", tag: "REELS" },
  { icon: "📈", name: "تنمية الأعمال رقمياً", desc: "خطط نمو شاملة تجمع إدارة الحسابات والإعلانات الممولة وتحليل البيانات لتحقيق أهدافك.", tag: "GROW YOUR BUSINESS" },
  { icon: "📱", name: "إدارة السوشيال ميديا", desc: "إدارة يومية متكاملة لحساباتك على إنستقرام وتيك توك وسناب شات — جدولة وتفاعل وتقارير شهرية.", tag: "SOCIAL MEDIA MANAGEMENT" },
];


const IMG_LCDB_01 = "/images/lcdb-01.jpg";
const IMG_LCDB_02 = "/images/lcdb-02.jpg";
const IMG_LCDB_03 = "/images/lcdb-03.jpg";
const IMG_LCDB_04 = "/images/lcdb-04.jpg";
const IMG_LCDB_05 = "/images/lcdb-05.jpg";
const IMG_LCDB_06 = "/images/lcdb-06.jpg";
const IMG_LCDB_07 = "/images/lcdb-07.jpg";
const IMG_LCDB_08 = "/images/lcdb-08.jpg";
const IMG_LCDB_09 = "/images/lcdb-09.jpg";
const IMG_LCDB_10 = "/images/lcdb-10.jpg";
const IMG_LCDB_11 = "/images/lcdb-11.jpg";
const IMG_LCDB_12 = "/images/lcdb-12.jpg";
const IMG_LCDB_13 = "/images/lcdb-13.jpg";
const IMG_LCDB_14 = "/images/lcdb-14.jpg";
const IMG_LCDB_WEBSITE = "/images/lcdb-website.jpg";

const PROPOSAL_HTML_B64 = "PCFET0NUWVBFIGh0bWw+CjxodG1sIGxhbmc9ImFyIiBkaXI9InJ0bCI+CjxoZWFkPgogICAgPG1ldGEgY2hhcnNldD0iVVRGLTgiPgogICAgPHRpdGxlPtil2LPYqtix2KfYqtmK2KzZitipINmG2YXZiCDYp9mE2YXYqNmK2LnYp9iqIC0gQUJEVUxMQUggTUFSS0VUSU5HPC90aXRsZT4KICAgIDxzdHlsZT4KICAgICAgICBib2R5IHsKICAgICAgICAgICAgYmFja2dyb3VuZC1jb2xvcjogIzAwMDAwMDsKICAgICAgICAgICAgY29sb3I6ICNmZmZmZmY7CiAgICAgICAgICAgIGZvbnQtZmFtaWx5OiAnU2Vnb2UgVUknLCBUYWhvbWEsIEdlbmV2YSwgVmVyZGFuYSwgc2Fucy1zZXJpZjsKICAgICAgICAgICAgbWFyZ2luOiAwOwogICAgICAgICAgICBwYWRkaW5nOiA0MHB4OwogICAgICAgIH0KICAgICAgICAuY29udGFpbmVyIHsKICAgICAgICAgICAgbWF4LXdpZHRoOiA4MDBweDsKICAgICAgICAgICAgbWFyZ2luOiAwIGF1dG87CiAgICAgICAgICAgIGJvcmRlcjogMnB4IHNvbGlkICNkNGFmMzc7CiAgICAgICAgICAgIHBhZGRpbmc6IDMwcHg7CiAgICAgICAgICAgIGJhY2tncm91bmQtY29sb3I6ICMwYTBhMGE7CiAgICAgICAgICAgIGJveC1zaGFkb3c6IDAgMCAyMHB4IHJnYmEoMjEyLCAxNzUsIDU1LCAwLjEpOwogICAgICAgIH0KICAgICAgICAuaGVhZGVyIHsKICAgICAgICAgICAgdGV4dC1hbGlnbjogY2VudGVyOwogICAgICAgICAgICBib3JkZXItYm90dG9tOiAycHggc29saWQgI2Q0YWYzNzsKICAgICAgICAgICAgcGFkZGluZy1ib3R0b206IDIwcHg7CiAgICAgICAgICAgIG1hcmdpbi1ib3R0b206IDMwcHg7CiAgICAgICAgfQogICAgICAgIC5sb2dvLXRleHQgewogICAgICAgICAgICBmb250LXNpemU6IDMycHg7CiAgICAgICAgICAgIGZvbnQtd2VpZ2h0OiBib2xkOwogICAgICAgICAgICBjb2xvcjogI2ZmZmZmZjsKICAgICAgICAgICAgbGV0dGVyLXNwYWNpbmc6IDJweDsKICAgICAgICAgICAgbWFyZ2luOiAwOwogICAgICAgIH0KICAgICAgICAuc3ViLWxvZ28gewogICAgICAgICAgICBmb250LXNpemU6IDE0cHg7CiAgICAgICAgICAgIGNvbG9yOiAjZDRhZjM3OwogICAgICAgICAgICBsZXR0ZXItc3BhY2luZzogNHB4OwogICAgICAgICAgICBtYXJnaW46IDVweCAwIDAgMDsKICAgICAgICAgICAgdGV4dC10cmFuc2Zvcm06IHVwcGVyY2FzZTsKICAgICAgICB9CiAgICAgICAgaDEgewogICAgICAgICAgICBjb2xvcjogI2Q0YWYzNzsKICAgICAgICAgICAgZm9udC1zaXplOiAyNHB4OwogICAgICAgICAgICB0ZXh0LWFsaWduOiBjZW50ZXI7CiAgICAgICAgICAgIG1hcmdpbi10b3A6IDIwcHg7CiAgICAgICAgfQogICAgICAgIGgyIHsKICAgICAgICAgICAgY29sb3I6ICNkNGFmMzc7CiAgICAgICAgICAgIGZvbnQtc2l6ZTogMjBweDsKICAgICAgICAgICAgYm9yZGVyLXJpZ2h0OiA0cHggc29saWQgI2Q0YWYzNzsKICAgICAgICAgICAgcGFkZGluZy1yaWdodDogMTBweDsKICAgICAgICAgICAgbWFyZ2luLXRvcDogMzBweDsKICAgICAgICB9CiAgICAgICAgaDMgewogICAgICAgICAgICBjb2xvcjogI2ZmZmZmZjsKICAgICAgICAgICAgZm9udC1zaXplOiAxNnB4OwogICAgICAgICAgICBtYXJnaW4tYm90dG9tOiAxMHB4OwogICAgICAgIH0KICAgICAgICBwIHsKICAgICAgICAgICAgZm9udC1zaXplOiAxNXB4OwogICAgICAgICAgICBsaW5lLWhlaWdodDogMS44OwogICAgICAgICAgICBjb2xvcjogI2UwZTBlMDsKICAgICAgICB9CiAgICAgICAgLm1ldGEtaW5mbyB7CiAgICAgICAgICAgIGJhY2tncm91bmQtY29sb3I6ICMxMTExMTE7CiAgICAgICAgICAgIHBhZGRpbmc6IDE1cHg7CiAgICAgICAgICAgIGJvcmRlci1yYWRpdXM6IDVweDsKICAgICAgICAgICAgYm9yZGVyOiAxcHggc29saWQgIzIyMjIyMjsKICAgICAgICAgICAgbWFyZ2luLWJvdHRvbTogMzBweDsKICAgICAgICB9CiAgICAgICAgLm1ldGEtaW5mbyBwIHsKICAgICAgICAgICAgbWFyZ2luOiA1cHggMDsKICAgICAgICAgICAgZm9udC1zaXplOiAxNHB4OwogICAgICAgIH0KICAgICAgICAubWV0YS1pbmZvIHN0cm9uZyB7CiAgICAgICAgICAgIGNvbG9yOiAjZDRhZjM3OwogICAgICAgIH0KICAgICAgICAuc3RlcC1jYXJkIHsKICAgICAgICAgICAgYmFja2dyb3VuZC1jb2xvcjogIzExMTExMTsKICAgICAgICAgICAgYm9yZGVyOiAxcHggc29saWQgI2Q0YWYzNzsKICAgICAgICAgICAgcGFkZGluZzogMjBweDsKICAgICAgICAgICAgbWFyZ2luLWJvdHRvbTogMjBweDsKICAgICAgICAgICAgYm9yZGVyLXJhZGl1czogNHB4OwogICAgICAgIH0KICAgICAgICAuZm9vdGVyIHsKICAgICAgICAgICAgdGV4dC1hbGlnbjogY2VudGVyOwogICAgICAgICAgICBtYXJnaW4tdG9wOiA0MHB4OwogICAgICAgICAgICBwYWRkaW5nLXRvcDogMjBweDsKICAgICAgICAgICAgYm9yZGVyLXRvcDogMXB4IHNvbGlkICMzMzMzMzM7CiAgICAgICAgICAgIGZvbnQtc2l6ZTogMTJweDsKICAgICAgICAgICAgY29sb3I6ICM4ODg4ODg7CiAgICAgICAgfQogICAgICAgIC5mb290ZXItdGFnbGluZSB7CiAgICAgICAgICAgIGNvbG9yOiAjZDRhZjM3OwogICAgICAgICAgICBmb250LXdlaWdodDogYm9sZDsKICAgICAgICAgICAgZm9udC1zaXplOiAxNHB4OwogICAgICAgICAgICBsZXR0ZXItc3BhY2luZzogMXB4OwogICAgICAgIH0KICAgIDwvc3R5bGU+CjwvaGVhZD4KPGJvZHk+Cgo8ZGl2IGNsYXNzPSJjb250YWluZXIiPgogICAgPGRpdiBjbGFzcz0iaGVhZGVyIj4KICAgICAgICA8ZGl2IGNsYXNzPSJsb2dvLXRleHQiPkFCRFVMTEFIIE1BUktFVElORzwvZGl2PgogICAgICAgIDxkaXYgY2xhc3M9InN1Yi1sb2dvIj5Tb2NpYWwgTWVkaWEgTWFya2V0aW5nPC9kaXY+CiAgICA8L2Rpdj4KCiAgICA8aDE+4pqc77iPINiv2LHYp9iz2Kkg2KrYrdmE2YrZhNmK2Kkg2YjYpdiz2KrYsdin2KrZitis2YrYqSDZhtmF2Ygg2KfZhNmF2KjZiti52KfYqiAo2K7Yt9ipINin2YTZgCAzMCDZitmI2YXZi9inKSDimpzvuI88L2gxPgoKICAgIDxkaXYgY2xhc3M9Im1ldGEtaW5mbyI+CiAgICAgICAgPHA+PHN0cm9uZz7ZhdmP2LnZjtivINiu2LXZiti12KfZiyDZhNmAOjwvc3Ryb25nPiDYpdiv2KfYsdipINmF2LfYudmFIFvYp9iz2YUg2YXYt9i52YUg2KfZhNi52YXZitmEXTwvcD4KICAgICAgICA8cD48c3Ryb25nPtiq2KfYsdmK2K4g2KfZhNil2LnYr9in2K86PC9zdHJvbmc+INmK2YjZhtmK2YggMjAyNjwvcD4KICAgICAgICA8cD48c3Ryb25nPtmF2YLYr9mFINmF2YY6PC9zdHJvbmc+INi52KjYryDYp9mE2YTZhyDZhNmE2KrYs9mI2YrZgiDYp9mE2LHZgtmF2YogKEFCRFVMTEFIIE1BUktFVElORyk8L3A+CiAgICA8L2Rpdj4KCiAgICA8aDI+8J+XsiDZhdmA2YLZgNiv2YXZgNipINin2YTYpdiv2KfYsdipINin2YTYqtiz2YjZitmC2YrYqTwvaDI+CiAgICA8cD7ZgdmKINiz2YjZgiDYp9mE2YXYt9in2LnZhSDYp9mE2K3Yp9mE2YrYjCDZhNmFINmK2LnYryAi2KrZgtiv2YrZhSDYt9i52KfZhSDYrNmK2K8iINmD2KfZgdmK2KfZiyDZiNit2K/ZhyDZhNi22YXYp9mGINiq2K/ZgdmCINin2YTYo9mI2LHYr9ix2KfYqiDYqNi02YPZhCDZhdiz2KrYr9in2YUuINin2YTYudmF2YrZhCDYo9i12KjYrSDZhdit2KfYt9in2Ysg2KjZhdim2KfYqiDYp9mE2K7Zitin2LHYp9iqINin2YTZhdi62LHZitipINmK2YjZhdmK2KfZiyDYudmE2Ykg2YXZhti12KfYqiDYp9mE2KrZiNin2LXZhCDYp9mE2KfYrNiq2YXYp9i52Yog2KfZhNmF2K7YqtmE2YHYqS48L3A+CiAgICA8cD7Yp9mE2YfYr9mBINmF2YYg2YfYsNmHINin2YTYpdiz2KrYsdin2KrZitis2YrYqSDZhNmK2LMg2YXYrNix2K8g2KXYr9in2LHYqSDYtdmB2K3YqSDYo9mIINmG2LTYsSDYqNmI2LPYqtin2Kog2LnYtNmI2KfYptmK2KnYjCDYqNmEINiq2LfYqNmK2YIgPHN0cm9uZz7Zh9mG2K/Ys9ipINiq2LPZiNmK2YLZitipINmF2KrZg9in2YXZhNipPC9zdHJvbmc+INiq2LbZhdmGINiq2K3ZiNmK2YQg2KfZhNmF2LTYp9mH2K/Yp9iqINin2YTYp9mB2KrYsdin2LbZitipINil2YTZiSDYo9mI2LHYr9ix2KfYqiDZgdi52YTZitipINmB2Yog2K/YsdisINin2YTZhdit2YQg2YjYqtmG2LTZiti3INit2LHZg9ipINin2YTYtdin2YTYqSDZiNin2YTYr9mE2YrZgdix2Yog2YTZhtmF2Ygg2KPYudmF2KfZhNmDIChHUk9XIFlPVVIgQlVTSU5FU1MpLjwvcD4KCiAgICA8aDI+8J+UjSDYp9mE2KzYstihINin2YTYo9mI2YQ6INin2YTZgdit2LUg2YjYp9mE2KrYrdmE2YrZhCDYp9mE2KXYs9iq2LHYp9iq2YrYrNmKIChUaGUgQnJhbmQgQXVkaXQpPC9oMj4KICAgIDxwPtmC2KjZhCDYpdi32YTYp9mCINij2Yog2K3ZhdmE2Kkg2KrYsdmI2YrYrNmK2Kkg2KPZiCDYtdix2YEg2YXZitiy2KfZhtmK2KfYqiDYpdi52YTYp9mG2YrYqdiMINmG2YLZiNmFINio2LnZhdmEINmB2K3YtSDYtNin2YXZhCDZhNiq2K3Yr9mK2K8gItmG2YLYp9i3INin2YTZh9iv2LEiINmI2KrYudiv2YrZhCDYp9mE2YXYs9in2LEg2KjZhtin2KHZiyDYudmE2YkgMyDZhdit2KfZiNixINij2LPYp9iz2YrYqTo8L3A+CiAgICAKICAgIDxoMz4x77iP4oOjINiq2K3ZhNmK2YQg2KfZhNis2KfYsNio2YrYqSDYp9mE2KjYtdix2YrYqSDZiNi12K/ZhdipINin2YTYrNmI2LkgKFZpc3VhbCBIdW5nZXIgQXVkaXQpPC9oMz4KICAgIDxwPtiq2YLZitmK2YUg2YXYr9mJINmC2K/YsdipINin2YTYtdmI2LEg2YjYp9mE2YHZitiv2YrZiNmH2KfYqiDYp9mE2K3Yp9mE2YrYqSDYudmE2Ykg2KXYq9in2LHYqSDYsdi62KjYqSDYp9mE2LTYsdin2KEg2KfZhNmB2YjYsdmK2Kkg2YTYr9mJINin2YTZhdiz2KrYrtiv2YUg2KPYq9mG2KfYoSDYp9mE2KrYtdmB2K0g2KfZhNmK2YjZhdmK2Iwg2YjZgdit2LUg2KfZhNiq2YbYp9iz2YIg2KfZhNmE2YjZhtmKINmI2LnZhNin2YLYqSDYp9mE2YXYrdiq2YjZiSDYqNin2YTZh9mI2YrYqSDYp9mE2KjYtdix2YrYqSDZhNmE2YXYt9i52YUg2YTYttmF2KfZhiDYq9io2KfYqiDYp9mE2KjYsdin2YbYryDZgdmKINiw2KfZg9ix2Kkg2KfZhNi52YXZitmELjwvcD4KCiAgICA8aDM+Mu+4j+KDoyDYqtit2YTZitmEINiz2YrZg9mI2YTZiNis2YrYqSDZiNiz2YTZiNmDINin2YTYrNmF2YfZiNixIChBdWRpZW5jZSBCZWhhdmlvcmFsIEFuYWx5c2lzKTwvaDM+CiAgICA8cD7Yr9ix2KfYs9ipINmI2KrYrdiv2YrYryAi2LPYp9i52KfYqiDYsNix2YjYqSDYp9mE2KzZiNi5IiAoSHVuZ2VyIFBlYWtzKSDYp9mE2K7Yp9i12Kkg2KjYrNmF2YfZiNixINin2YTZhdmG2LfZgtipINin2YTYrNi62LHYp9mB2YrYqSDYp9mE2YXYrdmK2LfYqSDYqNin2YTZhdi32LnZhSDZhNi22KjYtyDZhdmI2KfYudmK2K8g2KfZhNmG2LTYsSDYqNiv2YLYqdiMINio2KzYp9mG2Kgg2YLZitin2LMg2YXYudiv2YQg2KfYsdiq2K/Yp9ivINin2YTYudmF2YTYp9ihINiv2KfYrtmEINin2YTYsdiz2KfYptmEINmE2YXYudin2YTYrNipINij2Yog2KrYo9iu2YrYsSDZitiz2KjYqCDYrtiz2KfYsdipINin2YTYo9mI2LHYr9ix2KfYqi48L3A+CgogICAgPGgzPjPvuI/ig6Mg2KrYrdmE2YrZhCDYp9mE2YXZhtin2YHYs9ipINmI2KfZhNmF2YrYstipINin2YTYqtmG2KfZgdiz2YrYqSAoQ29tcGV0aXRpdmUgVVNQKTwvaDM+CiAgICA8cD7Yr9ix2KfYs9ipINij2YLYsdioINin2YTZhdmG2KfZgdiz2YrZhiDZgdmKINmG2YHYsyDYp9mE2YbYt9in2YIg2KfZhNis2LrYsdin2YHZiiDZiNiq2K3Yr9mK2K8g2YbZgtin2Lcg2YLZiNiq2YfZhSDZiNi22LnZgdmH2YXYjCDZhdi5INin2LPYqtiu2LHYp9isINin2YTZhdmG2KrYrCAi2KfZhNio2LfZhCIgKEhlcm8gUHJvZHVjdCkg2YXZhiDZgtin2KbZhdipINin2YTYt9i52KfZhSDZhNiv2YrZgyDZhNmK2YPZiNmGINmI2KfYrNmH2Kkg2KfZhNit2YXZhNin2Kog2KfZhNmC2KfYr9mF2KkuPC9wPgoKICAgIDxoMj7wn5OIINin2YTYrNiy2KEg2KfZhNir2KfZhtmKOiDYrti32Kkg2KfZhNmG2YXZiCDZiNmF2LbYp9i52YHYqSDYp9mE2KPZiNix2K/Ysdin2Kog2YHZiiAzMCDZitmI2YXZi9inPC9oMj4KICAgIDxwPtio2YbYp9ih2Ysg2LnZhNmJINmG2KrYp9im2Kwg2KfZhNiq2K3ZhNmK2YTYjCDZitiq2YUg2KfZhNin2YbYqtmC2KfZhCDZhdio2KfYtNix2Kkg2KXZhNmJINmF2LHYrdmE2Kkg2KfZhNiq2YbZgdmK2LAg2LnYqNixIDQg2LHZg9in2KbYsiDYpdiz2KrYsdin2KrZitis2YrYqSDYrtmB2YrYqTo8L3A+CgogICAgPGRpdiBjbGFzcz0ic3RlcC1jYXJkIj4KICAgICAgICA8aDM+8J+OrCDYp9mE2LHZg9mK2LLYqSDYp9mE2KPZiNmE2Yk6INi12YbYp9i52Kkg2YXYrdiq2YjZiSDYp9mE2K3ZiNin2LMgKFNlbnNvcnktQmFzZWQgQ29udGVudCk8L2gzPgogICAgICAgIDxwPjxzdHJvbmc+2KfZhNiq2YbZgdmK2LA6PC9zdHJvbmc+INin2YTYp9i52KrZhdin2K8g2KfZhNmD2YTZiiDYudmE2Ykg2KfZhNmB2YrYr9mK2YjZh9in2Kog2KfZhNmC2LXZitix2KkgKFJlZWxzKSDYp9mE2YXYtdmF2YXYqSDYqNiq2YPZhtmK2YMg2YrYsdmD2LIg2LnZhNmJINin2YTYqtmB2KfYtdmK2YQg2KfZhNit2LHZg9mK2Kkg2YjYp9mE2LPZhdi52YrYqSDZhNmE2KPZg9mEICjZhdir2YQ6INmF2LfZkdipINin2YTYrNio2YbYqSDYp9mE2KzYqNin2LHYqdiMINi12YjYqiDYp9mE2YLYsdmF2LTYqSDYp9mE2LDZh9io2YrYqSkuINmH2LDYpyDYp9mE2KrZg9mG2YrZgyDZitix2YHYuSDYp9mE2YjYtdmI2YQg2KfZhNi32KjZiti52Yog2YTZhNmF2LfYp9i52YUg2KjYtNmD2YQg2YLZitin2LPZiiAoUkVTVEFVUkFOVCBNQVJLRVRJTkcpLjwvcD4KICAgIDwvZGl2PgoKICAgIDxkaXYgY2xhc3M9InN0ZXAtY2FyZCI+CiAgICAgICAgPGgzPvCfl4LvuI8g2KfZhNix2YPZitiy2Kkg2KfZhNir2KfZhtmK2Kk6INmH2YbYr9iz2Kkg2KfZhNmF2YbZitmIINmI2KfZhNi52LHZiNi2INin2YTYsNmD2YrYqSAoTWVudSBFbmdpbmVlcmluZyk8L2gzPgogICAgICAgIDxwPjxzdHJvbmc+2KfZhNiq2YbZgdmK2LA6PC9zdHJvbmc+INin2KjYqtmD2KfYsSDZiNiq2LXZhdmK2YUg2LnYsdmI2LYg2K3YstmFINmF2K7Ytdi12KkuINin2YTZh9iv2YEg2YfZhtinINmE2YrYsyDYudmF2YQg2K7YtdmI2YXYp9iqINiq2K7Ys9ixINin2YTZhdi32LnZhdiMINio2YQg2LHZgdi5INmF2KrZiNiz2Lcg2YLZitmF2Kkg2KfZhNmB2KfYqtmI2LHYqSDZhNmE2LnZhdmK2YQg2KfZhNmI2KfYrdivIChBdmVyYWdlIFRpY2tldCBTaXplKSDZhNmK2LTYqtix2Yog2KjZhdio2YTYuiDYo9mD2KjYsSDZiNmH2Ygg2YrYtNi52LEg2KjYp9mE2LHYttinINmI2KfZhNiq2YjZgdmK2LEg2KfZhNmD2YTZii48L3A+CiAgICA8L2Rpdj4KCiAgICA8ZGl2IGNsYXNzPSJzdGVwLWNhcmQiPgogICAgICAgIDxoMz7wn46vINin2YTYsdmD2YrYstipINin2YTYq9in2YTYq9ipOiDYp9mE2KXYudmE2KfZhtin2Kog2KfZhNmF2K3ZhNmK2Kkg2YHYp9im2YLYqSDYp9mE2KfYs9iq2YfYr9in2YEgKEh5cGVyLUxvY2FsIFBhaWQgQ2FtcGFpZ25zKTwvaDM+CiAgICAgICAgPHA+PHN0cm9uZz7Yp9mE2KrZhtmB2YrYsDo8L3N0cm9uZz4g2KXYt9mE2KfZgiDYrdmF2YTYp9iqINil2LnZhNin2YbZitipINmF2YXZiNmE2Kkg2KrYudiq2YXYryDYudmE2Ykg2KfZhNiw2YPYp9ihINin2YTYp9i12LfZhtin2LnZitiMINiq2LPYqtmH2K/ZgSDYqNiv2YLYqSDYp9mE2YbYt9in2YIg2KfZhNis2LrYsdin2YHZiiDYp9mE2YHYudmE2Yog2YTZhNmF2LfYudmFICjZhdit2YrYtyAzINil2YTZiSA1INmD2YUg2YHZgti3INmE2LbZhdin2YYg2YPZgdin2KHYqSDYp9mE2K/ZhNmK2YHYsdmKINmI2LPYsdi52Kkg2KfZhNiq2YjYtdmK2YQp2Iwg2YXYuSDYqtmC2YTZitmEINiu2LfZiNin2Kog2KfZhNi32YTYqCDYudmE2Ykg2KfZhNi52YXZitmEINmE2LHZgdi5INmG2YXZiCDYp9mE2KjZitiy2YbYsyAoQ1JPVyBZT1VSIEJVU0lORVNTKS48L3A+CiAgICA8L2Rpdj4KCiAgICA8ZGl2IGNsYXNzPSJzdGVwLWNhcmQiPgogICAgICAgIDxoMz7wn5SBINin2YTYsdmD2YrYstipINin2YTYsdin2KjYudipOiDZhti42KfZhSDYpdi52KfYr9ipINin2YTYp9iz2KrZh9iv2KfZgSDYp9mE2LDZg9mKIChSZXRhcmdldGluZyBGdW5uZWwpPC9oMz4KICAgICAgICA8cD48c3Ryb25nPtin2YTYqtmG2YHZitiwOjwvc3Ryb25nPiDYqtmB2LnZitmEINil2LPYqtix2KfYqtmK2KzZitipINix2YLZhdmK2Kkg2K7Yp9i12Kkg2YTYpdi52KfYr9ipINin2LPYqtmH2K/Yp9mBINin2YTYo9i02K7Yp9i1INin2YTYsNmK2YYg2KPYqNiv2YjYpyDYp9mH2KrZhdin2YXYp9mLINmI2KrZgdin2LnZhNmI2Kcg2YXYuSDZgdmK2K/ZitmI2YfYp9iqINin2YTYt9i52KfZhSDZiNmE2YUg2YrYt9mE2KjZiNinINio2LnYr9iMINmI2KrZgtiv2YrZhSDYrdmI2KfZgdiyINi02LHYp9ihINiz2LHZiti52Kkg2YjZhdi62LHZitipINmE2YfZhSDZhNi22YXYp9mGINil2LrZhNin2YIg2KfZhNio2YrYudipINmB2YjYsdin2YsuPC9wPgogICAgPC9kaXY+CgogICAgPGgyPuKcqCDYp9mE2K7Yp9iq2YXYqSDZiNin2YTYrti32YjYqSDYp9mE2YLYp9iv2YXYqTwvaDI+CiAgICA8cD7Zh9iw2Ycg2KfZhNil2LPYqtix2KfYqtmK2KzZitipINiq2LbZhdmGINmG2YLZhCDYp9mE2YXYt9i52YUg2YXZhiDZhdix2K3ZhNipINin2YTYqtmI2KfYrNivINin2YTYqtmC2YTZitiv2Yog2KXZhNmJINmF2LHYrdmE2Kkg2KfZhNmC2YrYp9iv2Kkg2YjYstmK2KfYr9ipINin2YTZhdio2YrYudin2Kog2KjYtNmD2YQg2YXYttin2LnZgSDZiNmF2LPYqtiv2KfZhS48L3A+CiAgICA8cD48c3Ryb25nPtin2YTYrti32YjYqSDYp9mE2KrYp9mE2YrYqSDYp9mE2YXZiNi12Ykg2KjZh9inOjwvc3Ryb25nPiDZhdmG2K3ZhtinINi12YTYp9it2YrYqSDYp9mE2YjYtdmI2YQg2YTYqNmK2KfZhtin2Kog2KfZhNi12YHYrdipINin2YTYrdin2YTZitipIChJbnNpZ2h0cykg2YTZhtio2K/YoyDZgdmI2LHYp9mLINmB2Yog2KXYudiv2KfYryAi2KrZgtix2YrYsSDYp9mE2KrYrdmE2YrZhCDYp9mE2YXYrNin2YbZiiIg2KfZhNmF2LDZg9mI2LEg2YHZiiDYp9mE2KzYstihINin2YTYo9mI2YTYjCDZiNiq2K3Yr9mK2K8g2KPZiNmE2Ykg2K7Yt9mI2KfYqiDYp9mE2KrZhtmB2YrYsCDYp9mE2YHYudmE2Yog2YTZhdi32LnZhdmD2YUuPC9wPgoKICAgIDxkaXYgY2xhc3M9ImZvb3RlciI+CiAgICAgICAgPGRpdiBjbGFzcz0iZm9vdGVyLXRhZ2xpbmUiPkRFU0lHTlMgfCBSRUVMUyB8IFJFU1RBVVJBTlQgTUFSS0VUSU5HIHwgR1JPVyBZT1VSIEJVU0lORVNTPC9kaXY+CiAgICAgICAgPHA+QUJEVUxMQUggTUFSS0VUSU5HIMKpIDIwMjY8L3A+CiAgICA8L2Rpdj4KPC9kaXY+Cgo8L2JvZHk+CjwvaHRtbD4K";
const portfolioItems = [
  { cat: "restaurant", img: IMG_NUTELLA, name: "كاب كيك — مولتن كيك بالنوتيلا", desc: "حملة سوشيال ميديا احترافية لمنتج حلويات — تصميم بوستر شهية مع نص تسويقي جذاب.", tags: ["Instagram", "Food Marketing", "Photoshop"], client: "كاب كيك" },
  { cat: "restaurant", img: IMG_BURGER_FIRE, name: "برجر مطافي — حملة ترويجية", desc: "تصميم بوستر احترافي لمطعم برجر مع جو ناري مثير يعكس هوية العلامة التجارية.", tags: ["Facebook", "Restaurant", "Branding"], client: "برجر مطافي" },
  { cat: "restaurant", img: IMG_BUMBLE, name: "بامبل برجر — هوية وتسويق", desc: "حملة متكاملة لمطعم بامبل تشمل التصميم والمحتوى الترويجي وإبراز مميزات المنتج.", tags: ["Instagram", "Menu Design", "Brand"], client: "بامبل" },
  { cat: "restaurant", img: IMG_BURGER_OFFER, name: "عرض الميكس السريع — إعلان ممول", desc: "تصميم إعلان عرض خاص بخصم ٢٥٪ — نموذج تجريبي يوضح أسلوب العمل في الإعلانات.", tags: ["Facebook Ads", "Offers", "Design"], client: "نموذج تجريبي" },

  { cat: "restaurant", img: IMG_LCDB_01, name: "لا كاسا دي برجر — حملة الشواء", desc: "سيب الدايت دقيقة وتعالى — حملة ترويجية بصرية مثيرة لمطعم لا كاسا دي برجر تستهدف عشاق اللحوم والفحم.", tags: ["Instagram", "Restaurant", "La Casa De Burger"], client: "لا كاسا دي برجر" },
  { cat: "restaurant", img: IMG_LCDB_02, name: "لا كاسا دي برجر — الجوع", desc: "برغزنا ينهي الجوع — تصميم إعلاني احترافي يعكس هوية المطعم الناري وجودة البرجر.", tags: ["Instagram", "Restaurant", "La Casa De Burger"], client: "لا كاسا دي برجر" },
  { cat: "restaurant", img: IMG_LCDB_03, name: "لا كاسا دي برجر — بيتزا", desc: "بيتزا بطعم لا يُقاوم — حملة ترويجية للبيتزا بتصميم جذاب ومحتوى تسويقي مؤثر.", tags: ["Instagram", "Restaurant", "La Casa De Burger"], client: "لا كاسا دي برجر" },
  { cat: "restaurant", img: IMG_LCDB_04, name: "لا كاسا دي برجر — بيتزا ساخنة", desc: "بيتزا دافئة جاهزة — تصوير احترافي للبيتزا يبرز جودة المكونات والجبنة الذائبة.", tags: ["Instagram", "Restaurant", "La Casa De Burger"], client: "لا كاسا دي برجر" },
  { cat: "restaurant", img: IMG_LCDB_05, name: "لا كاسا دي برجر — فرايد تشيكن", desc: "تشيكن مقرمش انفجاري — تصوير ديناميكي احترافي لبرجر الدجاج المقرمش بأسلوب بصري مثير.", tags: ["Instagram", "Restaurant", "La Casa De Burger"], client: "لا كاسا دي برجر" },
  { cat: "restaurant", img: IMG_LCDB_06, name: "لا كاسا دي برجر — فرايد تشيكن ٢", desc: "طعم القرمشة ما يتفوتش — حملة ترويجية لبرجر الدجاج المقرمش مع إبراز هوية المطعم.", tags: ["Instagram", "Restaurant", "La Casa De Burger"], client: "لا كاسا دي برجر" },
  { cat: "restaurant", img: IMG_LCDB_07, name: "لا كاسا دي برجر — الخطة الكبرى", desc: "الخطة الكبرى طعم لا يُقاوم — تصميم إبداعي يعرض أضخم برجر مع إطار درامي يعكس قوة البراند.", tags: ["Instagram", "Restaurant", "La Casa De Burger"], client: "لا كاسا دي برجر" },
  { cat: "restaurant", img: IMG_LCDB_08, name: "لا كاسا دي برجر — كومبو ١٩٥", desc: "الـ Ultimate Hunger Fix — إعلان كومبو احترافي بسعر ١٩٥ جنيه يجمع البرجر والفرايز والمشروب.", tags: ["Instagram", "Restaurant", "La Casa De Burger"], client: "لا كاسا دي برجر" },
  { cat: "restaurant", img: IMG_LCDB_09, name: "لا كاسا دي برجر — الجودة", desc: "طعم ما بيتعادش — تصميم ترويجي عالي الجودة للبرجر المشوي بالفحم يبرز التفاصيل الشهية.", tags: ["Instagram", "Restaurant", "La Casa De Burger"], client: "لا كاسا دي برجر" },
  { cat: "restaurant", img: IMG_LCDB_10, name: "لا كاسا دي برجر — انفجاري", desc: "لا كاسا دي برجر — تصوير انفجاري للبرجر يبرز الجبنة والمقادير بأسلوب درامي مذهل.", tags: ["Instagram", "Restaurant", "La Casa De Burger"], client: "لا كاسا دي برجر" },
  { cat: "restaurant", img: IMG_LCDB_11, name: "لا كاسا دي برجر — البطولة", desc: "صابور كيونس كامبيونس — تصميم إبداعي ربط المطعم بأجواء كأس العالم بهوية بصرية قوية.", tags: ["Instagram", "Restaurant", "La Casa De Burger"], client: "لا كاسا دي برجر" },
  { cat: "restaurant", img: IMG_LCDB_12, name: "لا كاسا دي برجر — مصر", desc: "لا كاسا دي برجر مصر — حملة ترويجية للفرع المصري مع إبراز العروض والتواصل.", tags: ["Instagram", "Restaurant", "La Casa De Burger"], client: "لا كاسا دي برجر" },
  { cat: "restaurant", img: IMG_LCDB_13, name: "لا كاسا دي برجر — قائمة ١", desc: "قائمة طعام لا كاسا دي برجر — تصميم منيو شامل للبرجر والدجاج والراب والحواوشي والباستا.", tags: ["Instagram", "Restaurant", "La Casa De Burger"], client: "لا كاسا دي برجر" },
  { cat: "restaurant", img: IMG_LCDB_14, name: "لا كاسا دي برجر — قائمة ٢", desc: "قائمة بيتزا ومقبلات لا كاسا دي برجر — تصميم منيو شامل للبيتزا والمقبلات والرايزو والمشروبات.", tags: ["Instagram", "Restaurant", "La Casa De Burger"], client: "لا كاسا دي برجر" },
  { cat: "website", img: IMG_LCDB_WEBSITE, name: "لا كاسا دي برجر — الموقع الرسمي", desc: "موقع كامل للمطعم يشمل المنيو التفاعلي بالصور وأزرار الطلب المباشر عبر واتساب — تصميم وتطوير كامل من الصفر.", tags: ["Web Design", "Restaurant", "UI/UX"], client: "لا كاسا دي برجر", link: "https://lacasa-de-burger-website.vercel.app/" },
  { cat: "brand", img: IMG_SCIB, name: "SCIB Paints — تصميم ترويجي", desc: "تصميم بوستر احترافي لمنتج دهانات يجمع بين الجودة البصرية والرسالة التسويقية الواضحة.", tags: ["Product Marketing", "Design", "Brand"], client: "SCIB Paints" },
];

// أعمالي الأساسية (القديمة) بقت "احتياطية" — بتظهر بعد الأعمال الجديدة اللي
// بترفعها من لوحة الأدمن، مش بدالها. بالشكل ده أعمالك الحقيقية القديمة
// متتفقدش، وفي نفس الوقت أي بوست جديد من الأدمن بيظهر فوقها تلقائيًا.
const LEGACY_CATEGORY_LABELS = { restaurant: "مطاعم وأكل", website: "مواقع الويب", brand: "هوية بصرية" };
const legacyPortfolioItems = portfolioItems.map((p) => ({
  id: `legacy-${p.name}`,
  title: p.name,
  short_description: p.desc,
  main_image_url: p.img,
  category: LEGACY_CATEGORY_LABELS[p.cat] || "عام",
  client_name: p.client,
  is_pinned: false,
  legacyLink: p.link,
}));

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

function Particles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 18 }).map((_, i) => (
        <div key={i} className="absolute rounded-full" style={{ width: 1.5 + (i % 3) * 0.7, height: 1.5 + (i % 3) * 0.7, left: `${(i * 17 + 7) % 100}%`, background: GOLD, animation: `floatUp ${10 + (i % 6) * 2}s linear ${(i * 1.3) % 8}s infinite`, opacity: 0 }} />
      ))}
    </div>
  );
}

function LogoSVG({ size = 110 }) {
  return (
    <div style={{ position: "relative", width: size, height: size * 0.72, display: "inline-block" }}>
      {/* Outer pulse ring */}
      <div style={{
        position: "absolute", inset: -14,
        borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(201,150,58,0.18) 0%, transparent 70%)",
        animation: "logoPulse 2.8s ease-in-out infinite",
        pointerEvents: "none",
      }} />
      {/* Inner glow ring */}
      <div style={{
        position: "absolute", inset: -6,
        borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(245,215,142,0.12) 0%, transparent 65%)",
        animation: "logoPulse 2.8s ease-in-out infinite 0.4s",
        pointerEvents: "none",
      }} />
      <Image
        src={IMG_LOGO}
        alt="Abdullah Marketing Logo"
        width={size}
        height={Math.round(size * 0.72)}
        priority
        style={{
          width: size,
          height: size * 0.72,
          objectFit: "contain",
          position: "relative",
          zIndex: 1,
          filter: "drop-shadow(0 0 18px rgba(201,150,58,0.55)) drop-shadow(0 0 40px rgba(201,150,58,0.25))",
          animation: "logoGlow 2.8s ease-in-out infinite",
        }}
      />
    </div>
  );
}

function HeroPage({ setPage }) {
  return (
    <section dir="rtl" className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-28 pb-16 relative overflow-hidden" style={{ background: "transparent" }}>
      <div className="absolute pointer-events-none" style={{ top: "8%", left: "50%", transform: "translateX(-50%)", width: 700, height: 500, background: "radial-gradient(ellipse, rgba(201,150,58,0.12) 0%, transparent 65%)" }} />
      <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
      <Particles />
      <div className="inline-flex items-center gap-2 text-xs font-bold tracking-widest mb-7 px-5 py-2 rounded-full border" style={{ color: GOLD, borderColor: "rgba(201,150,58,0.3)", animation: "fadeDown .8s ease forwards" }}>
        ✦ SOCIAL MEDIA MARKETING · أسيوط ✦
      </div>
      <div className="mb-7" style={{ animation: "scaleIn 1s cubic-bezier(.16,1,.3,1) forwards" }}>
        <LogoSVG size={160} />
      </div>
      <h1 className="font-black tracking-widest leading-none mb-2" style={{ fontFamily: "var(--font-cinzel), serif", fontSize: "clamp(40px,8vw,80px)", background: `linear-gradient(135deg, ${GOLD}, ${GOLD3}, ${GOLD})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", animation: "fadeUp .9s .15s ease both" }}>
        ABDULLAH
      </h1>
      <h2 className="tracking-widest mb-8 font-bold" style={{ fontFamily: "var(--font-cinzel), serif", fontSize: "clamp(12px,2vw,17px)", color: "#666", letterSpacing: 10, animation: "fadeUp .9s .25s ease both" }}>
        MARKETING
      </h2>
      <p className="text-base leading-relaxed max-w-lg mx-auto mb-10" style={{ color: "#999", animation: "fadeUp .9s .35s ease both" }}>
        نحوّل حضورك الرقمي إلى محرك نمو حقيقي — محتوى احترافي، إدارة ذكية، ونتائج تُقاس بالأرقام
      </p>
      <div className="flex gap-3 flex-wrap justify-center mb-16" style={{ animation: "fadeUp .9s .45s ease both" }}>
        <a href={WA_LINK} target="_blank" rel="noreferrer" className="font-black px-8 py-3 rounded-xl text-black text-sm transition duration-300 hover:-translate-y-1" style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD2})`, boxShadow: "0 4px 30px rgba(201,150,58,0.3)" }}>
          🚀 ابدأ رحلتك معنا
        </a>
        <button onClick={() => { setPage("home"); setTimeout(() => { const el = document.getElementById("pricing"); if (el) el.scrollIntoView({ behavior: "smooth" }); }, 80); }} className="font-bold px-8 py-3 rounded-xl text-sm transition duration-300 border hover:bg-yellow-900/10" style={{ color: GOLD, borderColor: "rgba(201,150,58,0.4)" }}>
          📦 الباقات
        </button>
        <button onClick={() => setPage("gallery")} className="font-bold px-8 py-3 rounded-xl text-sm transition duration-300 border hover:bg-yellow-900/10" style={{ color: GOLD, borderColor: "rgba(201,150,58,0.4)" }}>
          📁 الباقات المخصصة
        </button>
      </div>
      <div className="flex flex-wrap justify-center border-t border-b w-full max-w-2xl" style={{ borderColor: "#2A2A2A", animation: "fadeUp .9s .55s ease both" }}>
        {[
          { num: "+5", label: "عملاء راضون" },
          { num: "3+", label: "مجالات متخصصة" },
          { num: "6", label: "خدمات احترافية" },
          { num: "24/7", label: "دعم مستمر" },
        ].map((s, i) => (
          <div key={i} className="flex-1 py-5 px-6 text-center" style={{ borderLeft: i < 3 ? "1px solid #2A2A2A" : "none", minWidth: 120 }}>
            <span className="block text-2xl font-black mb-1" style={{ fontFamily: "var(--font-cinzel), serif", color: GOLD }}>{s.num}</span>
            <span className="text-xs tracking-wider font-semibold" style={{ color: "#666" }}>{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ServicesSection({ setPage }) {
  const [dbServices, setDbServices] = useState(null);

  // خدمات قابلة للإضافة والتعديل من السوبر أدمن (تبويب "المحتوى" → "🛠️ خدماتي")
  // — لو مفيش خدمات لسه مضافة من الأدمن، بتظهر القائمة الأساسية القديمة
  // كـ"احتياطي" عشان القسم ما يفضلش فاضي.
  useEffect(() => {
    let alive = true;
    fetchPublished("services")
      .then((data) => { if (alive) setDbServices(data); })
      .catch(() => { if (alive) setDbServices([]); });
    return () => { alive = false; };
  }, []);

  const visibleServices = dbServices === null ? [] : dbServices.length > 0 ? dbServices : legacyServices;

  return (
    <section id="services" dir="rtl" className="py-24 px-6 md:px-10" style={{ background: "transparent" }}>
      <Reveal className="text-center mb-14">
        <SectionLabel>OUR SERVICES</SectionLabel>
        <h2 className="text-3xl md:text-4xl font-black tracking-wide mb-3 text-white" style={{ fontFamily: "var(--font-cinzel), serif" }}>خدماتنا الاحترافية</h2>
        <p className="text-sm text-gray-500 leading-relaxed max-w-md mx-auto">حلول متكاملة تحوّل علامتك التجارية إلى قوة رقمية لا تُنافَس</p>
      </Reveal>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
        {visibleServices.map((s, i) => (
          <Reveal key={s.id || i} delay={i * 45}>
            <div className="card-pro p-8 relative overflow-hidden group cursor-default">
              <div className="absolute top-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl mb-5 transition duration-300 group-hover:scale-110" style={{ background: "rgba(201,150,58,0.08)", border: "1px solid rgba(201,150,58,0.2)" }}>{s.icon}</div>
              <h3 className="text-base font-bold mb-2" style={{ color: "var(--text-primary)" }}>{s.name}</h3>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{s.desc || s.description}</p>
              <span className="badge-gold inline-flex mt-4">{s.tag}</span>
            </div>
          </Reveal>
        ))}
      </div>
      <Reveal className="text-center mt-12">
        <a href={WA_LINK} target="_blank" rel="noreferrer" className="inline-block font-black px-10 py-4 rounded-xl text-black text-sm transition duration-300 hover:-translate-y-1" style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD2})`, boxShadow: "0 4px 30px rgba(201,150,58,0.3)" }}>
          💬 احجز استشارة مجانية الآن
        </a>
      </Reveal>
    </section>
  );
}

function PortfolioSection() {
  const [filter, setFilter] = useState("all");
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null);
  const WA_NUMBER = (WA_LINK.match(/wa\.me\/(\d+)/) || [])[1] || "201069032563";

  // تحميل الأعمال المنشورة فعليًا من قاعدة البيانات (مرتّبة: المثبّت أولاً،
  // بعدين الأحدث أولاً) — يعني أي بوست جديد بيرفعه الأدمن يظهر هنا فورًا
  // من غير ما حد يحتاج يدوس "شاهد كل الأعمال".
  useEffect(() => {
    fetchDistinctCategories().then(setCategories).catch(() => {});
    fetchPortfolioItems({ page: 1 })
      .then((res) => setItems(res.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  // الترتيب: أعمال الأدمن الجديدة (مثبّت فوق، بعدين الأحدث) أولاً،
  // بعدين أعمالي الأساسية القديمة كـ "احتياطي" أسفل منها — مفيش حاجة بتضيع.
  const combinedItems = [...items, ...legacyPortfolioItems];
  const homepageItems = combinedItems.slice(0, 6);
  const allCategories = Array.from(new Set([...categories, ...Object.values(LEGACY_CATEGORY_LABELS)]));
  const visible = filter === "all" ? homepageItems : homepageItems.filter((p) => p.category === filter);

  function openLightbox(item) {
    setLightbox(item);
    if (!String(item.id).startsWith("legacy-")) incrementViews(item.id);
  }

  function requestSimilar(item) {
    if (!String(item.id).startsWith("legacy-")) logDesignRequest(item.id);
    const pageUrl = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}#portfolio-gallery` : "";
    return buildWhatsappOrderMessage(item, { whatsappNumber: WA_NUMBER, pageUrl });
  }

  return (
    <section id="portfolio" dir="rtl" className="py-24 px-6 md:px-10" style={{ background: "transparent" }}>
      <Reveal className="text-center mb-8">
        <SectionLabel>MY WORK</SectionLabel>
        <h2 className="text-3xl md:text-4xl font-black tracking-wide mb-3 text-white" style={{ fontFamily: "var(--font-cinzel), serif" }}>أعمالي الحقيقية</h2>
        <p className="text-sm text-gray-500 leading-relaxed max-w-md mx-auto">تصاميم ومحتوى نفّذته لعملاء حقيقيين في مجالات مختلفة</p>
      </Reveal>

      {allCategories.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          <button onClick={() => setFilter("all")} className="px-5 py-2 rounded-full text-xs font-bold tracking-wider border transition duration-200" style={{ background: filter === "all" ? "rgba(201,150,58,0.12)" : "transparent", borderColor: filter === "all" ? GOLD : "#2A2A2A", color: filter === "all" ? GOLD : "#666" }}>الكل</button>
          {allCategories.map((c) => (
            <button key={c} onClick={() => setFilter(c)} className="px-5 py-2 rounded-full text-xs font-bold tracking-wider border transition duration-200" style={{ background: filter === c ? "rgba(201,150,58,0.12)" : "transparent", borderColor: filter === c ? GOLD : "#2A2A2A", color: filter === c ? GOLD : "#666" }}>{c}</button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-center text-sm" style={{ color: "#666" }}>جاري التحميل...</p>
      ) : visible.length === 0 ? (
        <p className="text-center text-sm" style={{ color: "#666" }}>لسه مفيش أعمال منشورة في التصنيف ده.</p>
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
        {visible.map((item, i) => (
          <Reveal key={item.id} delay={i * 45}>
            <div onClick={() => openLightbox(item)} className="card-pro overflow-hidden cursor-pointer group" style={item.is_pinned ? { borderColor: "rgba(201,150,58,0.5)" } : undefined}>
              <div className="relative h-52 overflow-hidden">
                {item.main_image_url && (
                  <Image src={item.main_image_url} alt={item.title} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl scale-50 group-hover:scale-100 transition-transform duration-300" style={{ background: GOLD }}>👁️</div>
                </div>
                {item.client_name && (
                  <div className="absolute top-3 right-3 text-xs font-bold px-2 py-1 rounded-full" style={{ background: "rgba(0,0,0,0.8)", color: GOLD, border: "1px solid rgba(201,150,58,0.3)" }}>
                    {item.client_name}
                  </div>
                )}
                {item.is_pinned && (
                  <div className="absolute top-3 left-3 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1" style={{ background: "rgba(201,150,58,0.95)", color: "#000" }}>
                    📌 مثبّت
                  </div>
                )}
              </div>
              <div className="p-5">
                <div className="text-xs font-bold tracking-widest mb-1" style={{ color: GOLD }}>{(item.category || "").toUpperCase()}</div>
                <h3 className="text-sm font-bold mb-1" style={{ color: "var(--text-primary)" }}>{item.title}</h3>
                <p className="text-xs leading-relaxed mb-3" style={{ color: "var(--text-muted)" }}>{item.short_description}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
      )}

      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: "rgba(0,0,0,0.95)" }} onClick={() => setLightbox(null)}>
          <div className="rounded-3xl overflow-hidden max-w-lg w-full relative" style={{ background: "#161616", border: "1px solid rgba(201,150,58,0.2)" }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setLightbox(null)} className="absolute top-4 left-4 z-10 w-9 h-9 rounded-full flex items-center justify-center text-lg" style={{ background: "rgba(0,0,0,0.7)", border: "1px solid rgba(201,150,58,0.3)", color: GOLD }}>✕</button>
            {lightbox.main_image_url && (
              <img src={lightbox.main_image_url} alt={lightbox.title} loading="lazy" className="w-full max-h-80 object-cover" />
            )}
            <div className="p-6">
              {lightbox.client_name && <div className="text-xs font-bold tracking-widest mb-1" style={{ color: GOLD }}>عميل: {lightbox.client_name}</div>}
              <h3 className="text-xl font-bold text-white mb-2">{lightbox.title}</h3>
              <p className="text-sm leading-relaxed mb-4" style={{ color: "#888" }}>{lightbox.short_description}</p>
              <div className="flex flex-wrap gap-3">
                {lightbox.legacyLink && (
                  <a href={lightbox.legacyLink} target="_blank" rel="noreferrer" className="inline-block font-black px-6 py-3 rounded-xl text-sm" style={{ background: "rgba(201,150,58,0.1)", border: `1px solid ${GOLD}`, color: GOLD }}>
                    🌐 زيارة الموقع
                  </a>
                )}
                <a href={requestSimilar(lightbox)} target="_blank" rel="noreferrer" className="inline-block font-black px-6 py-3 rounded-xl text-black text-sm" style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD2})` }}>
                  💬 اطلب تصميم مشابه
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      <Reveal className="text-center mt-14 flex flex-wrap justify-center gap-4">
        <a href="#portfolio-gallery" className="inline-block font-black px-8 py-4 rounded-xl text-sm transition duration-300 hover:-translate-y-1" style={{ background: "transparent", border: `1px solid ${GOLD}`, color: GOLD }}>
          🎨 شاهد كل الأعمال
        </a>
        <a href={WA_LINK} target="_blank" rel="noreferrer" className="inline-block font-black px-10 py-4 rounded-xl text-black text-sm transition duration-300 hover:-translate-y-1" style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD2})`, boxShadow: "0 4px 30px rgba(201,150,58,0.3)" }}>
          🚀 ابدأ مشروعك الآن
        </a>
      </Reveal>
    </section>
  );
}

function TipsSection() {
  return (
    <section id="tips" dir="rtl" className="py-24 px-6 md:px-10" style={{ background: "transparent" }}>
      <Reveal className="text-center mb-14">
        <SectionLabel>TIPS & INSIGHTS</SectionLabel>
        <h2 className="text-3xl md:text-4xl font-black tracking-wide mb-3 text-white" style={{ fontFamily: "var(--font-cinzel), serif" }}>نصائح للمشاريع</h2>
        <p className="text-sm text-gray-500 leading-relaxed max-w-md mx-auto">خلاصة تجربتي — نصائح عملية تساعدك تنمو رقمياً بشكل أسرع وأذكى</p>
      </Reveal>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {tips.map((t, i) => (
          <Reveal key={i} delay={i * 35}>
            <div className="rounded-2xl p-8 border relative overflow-hidden transition duration-300 group hover:-translate-y-1" style={{ background: "#161616", borderColor: "#2A2A2A" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(201,150,58,0.25)"; e.currentTarget.style.boxShadow = "0 20px 60px rgba(0,0,0,.4)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#2A2A2A"; e.currentTarget.style.boxShadow = "none"; }}>
              <div className="absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
              <span className="absolute top-4 left-5 text-5xl font-black leading-none pointer-events-none select-none" style={{ fontFamily: "var(--font-cinzel), serif", background: "linear-gradient(135deg, rgba(201,150,58,0.18), rgba(201,150,58,0.05))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>{t.num}</span>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl mb-4 relative z-10" style={{ background: "rgba(201,150,58,0.08)", border: "1px solid rgba(201,150,58,0.2)" }}>{t.icon}</div>
              <h3 className="text-sm font-bold text-white mb-2 relative z-10">{t.title}</h3>
              <p className="text-xs leading-relaxed relative z-10" style={{ color: "#666" }}>{t.body}</p>
              <span className="inline-block mt-4 text-xs font-bold tracking-wider px-3 py-1 rounded-full relative z-10" style={{ color: GOLD, background: "rgba(201,150,58,0.07)", border: "1px solid rgba(201,150,58,0.18)" }}>{t.tag}</span>
            </div>
          </Reveal>
        ))}
      </div>
      <Reveal className="text-center mt-10">
        <button
          onClick={() => {
            const html = atob(PROPOSAL_HTML_B64);
            const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
          }}
          className="inline-block font-black px-10 py-4 rounded-xl text-sm transition duration-300 hover:-translate-y-1 border"
          style={{ color: GOLD, borderColor: GOLD, background: "rgba(201,150,58,0.08)" }}
        >
          📊 دراسة تحليلية وإستراتيجية نمو المبيعات (خطة الـ 30 يومًا)
        </button>
      </Reveal>
    </section>
  );
}

/* ===================== Build Your Package — config ===================== */
/* Tweak any price here — nothing else in the component needs to change.  */
const BUILDER_UNIT_PRICE = {
  post: 60,      // extra post beyond the package's included amount
  story: 40,     // extra story beyond the package's included amount
  reel: 400,     // extra AI reel beyond the package's included amount
  script: 250,   // extra script beyond the package's included amount (and for المحتوى section)
  content: 120,  // كتابة محتوى (content writing, per piece)
  designPerPlatform: 150, // كل تصميم إضافي لكل منصة في الهوية البصرية
};

const BUILD_PACKAGES = [
  { id: 1, icon: "🥉", tier: "الأساسية", price: 1800, color: "#CD7F32", glow: "rgba(205,127,50,0.35)", base: { posts: 8, stories: 8, reels: 0, scripts: 0 } },
  { id: 2, icon: "🥈", tier: "المتقدمة", price: 2800, color: "#C0C0C0", glow: "rgba(192,192,192,0.3)", base: { posts: 12, stories: 12, reels: 2, scripts: 2 } },
  { id: 3, icon: "🥇", tier: "الاحترافية", price: 4500, color: GOLD, glow: "rgba(201,150,58,0.45)", base: { posts: 16, stories: 20, reels: 4, scripts: 4 } },
  { id: 4, icon: "💎", tier: "الشاملة", price: 6500, color: "#6ee7f7", glow: "rgba(110,231,247,0.3)", base: { posts: 20, stories: 30, reels: 8, scripts: 8 } },
];

const WEBSITE_OPTIONS = [
  { key: "landing", label: "Landing Page", icon: "🌐", tiers: [2500, 3000, 3500] },
  { key: "company", label: "موقع شركة احترافي", icon: "🏢", tiers: [4500, 5500, 7000] },
  { key: "store", label: "متجر إلكتروني", icon: "🛒", tiers: [6000, 8000, 10000] },
  { key: "menu", label: "منيو إلكتروني QR للمطاعم", icon: "📱", tiers: [1500, 2000, 3000] },
];

const PLATFORM_LIST = ["Facebook", "Instagram", "TikTok", "X", "Snapchat", "LinkedIn", "YouTube", "Google Business"];

const SOCIAL_PAGE_OPTIONS = [
  { key: "facebook", label: "إنشاء صفحة Facebook" },
  { key: "instagram", label: "إنشاء صفحة Instagram" },
  { key: "tiktok", label: "إنشاء صفحة TikTok" },
  { key: "x", label: "إنشاء صفحة X" },
  { key: "linkedin", label: "إنشاء صفحة LinkedIn" },
  { key: "youtube", label: "إنشاء قناة YouTube" },
  { key: "googleBusiness", label: "إنشاء Google Business" },
  { key: "metaBM", label: "ربط Meta Business Manager" },
];
const SOCIAL_PAGE_PRICE = 500;

const AI_VIDEO_TIERS = [
  { key: "basic", label: "Basic", price: 400 },
  { key: "standard", label: "Standard", price: 700 },
  { key: "premium", label: "Premium", price: 1000 },
  { key: "cinematic", label: "Cinematic", price: 1500 },
];

const LOGO_TIERS = [800, 1200, 1500, 2000];
const BRAND_TIERS = [3000, 5000, 8000];

const ADS_OPTIONS = [
  { key: "campaign", label: "إدارة حملة إعلانية ممولة", price: 1500 },
  { key: "adCopy", label: "كتابة إعلان ممول", price: 300 },
  { key: "fullCampaign", label: "كتابة حملة إعلانية كاملة", price: 700 },
];

/* ===================== small building blocks ===================== */

function useCountUp(value, duration = 400) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);
  useEffect(() => {
    const start = prevRef.current;
    const end = value;
    const startTime = performance.now();
    let raf;
    function tick(now) {
      const progress = Math.min(1, (now - startTime) / duration);
      setDisplay(Math.round(start + (end - start) * progress));
      if (progress < 1) raf = requestAnimationFrame(tick);
      else prevRef.current = end;
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return display;
}

function BCard({ children, style = {} }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(201,150,58,0.15)",
        borderRadius: 18,
        padding: "22px 20px",
        marginBottom: 18,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function BSectionTitle({ icon, children }) {
  return (
    <h3 style={{ fontFamily: "var(--font-cairo), sans-serif", fontSize: 18, fontWeight: 900, color: GOLD2, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
      <span>{icon}</span>{children}
    </h3>
  );
}

function BCounter({ label, value, onChange, min = 0 }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <span style={{ color: "#ddd", fontSize: 14 }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid rgba(201,150,58,0.3)", background: "rgba(201,150,58,0.08)", color: GOLD2, fontSize: 16, fontWeight: 900, cursor: "pointer" }}
        >−</button>
        <span style={{ minWidth: 26, textAlign: "center", color: "#fff", fontWeight: 800, fontSize: 15 }}>{value}</span>
        <button
          onClick={() => onChange(value + 1)}
          style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid rgba(201,150,58,0.3)", background: "rgba(201,150,58,0.08)", color: GOLD2, fontSize: 16, fontWeight: 900, cursor: "pointer" }}
        >+</button>
      </div>
    </div>
  );
}

function BCheck({ label, checked, onChange, price }) {
  return (
    <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "11px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", cursor: "pointer" }}>
      <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            width: 20, height: 20, borderRadius: 6, flexShrink: 0,
            border: `1.5px solid ${checked ? GOLD : "rgba(255,255,255,0.25)"}`,
            background: checked ? GOLD : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#000", fontSize: 12, fontWeight: 900, transition: "all 0.2s",
          }}
        >{checked ? "✓" : ""}</span>
        <span style={{ color: "#ddd", fontSize: 14 }}>{label}</span>
      </span>
      {price != null && <span style={{ color: GOLD2, fontSize: 13, fontWeight: 700 }}>{price.toLocaleString()} ج.م</span>}
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ display: "none" }} />
    </label>
  );
}

function BTierPicker({ tiers, value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10, marginBottom: 4 }}>
      {tiers.map((price, i) => (
        <button
          key={i}
          onClick={() => onChange(i)}
          style={{
            padding: "6px 14px",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 800,
            cursor: "pointer",
            border: `1px solid ${value === i ? GOLD : "rgba(255,255,255,0.15)"}`,
            background: value === i ? "rgba(201,150,58,0.15)" : "transparent",
            color: value === i ? GOLD2 : "#999",
          }}
        >
          {price.toLocaleString()} ج.م
        </button>
      ))}
    </div>
  );
}

/* ===================== BuilderPage ===================== */

function BuilderPage({ setPage, initialData }) {
  useReveal();

  // package + project name
  const [pkgId, setPkgId] = useState(null);
  const [projectName, setProjectName] = useState("");
  const [savedName, setSavedName] = useState("");

  // بيانات الباقة المخصصة (نظام الحفظ في Supabase)
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [clientNotes, setClientNotes] = useState("");
  const [saveToast, setSaveToast] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [subscribePkg, setSubscribePkg] = useState(null);

  // package customization counters (absolute counts, base comes from package)
  const [posts, setPosts] = useState(0);
  const [stories, setStories] = useState(0);
  const [reels, setReels] = useState(0);
  const [scripts, setScripts] = useState(0);

  // additional services
  const [websites, setWebsites] = useState({}); // { landing: {on,tier}, ... }
  const [identityOn, setIdentityOn] = useState(false);
  const [platforms, setPlatforms] = useState({}); // { Facebook: 2 }
  const [logo, setLogo] = useState({ on: false, tier: 0 });
  const [brand, setBrand] = useState({ on: false, tier: 0 });
  const [socialPages, setSocialPages] = useState({});
  const [aiVideo, setAiVideo] = useState({ on: false, tier: "standard", qty: 1 });
  const [ads, setAds] = useState({});
  const [extraScripts, setExtraScripts] = useState(0);
  const [extraContent, setExtraContent] = useState(0);

  const pkg = BUILD_PACKAGES.find((p) => p.id === pkgId);

  // لو جاي من "استخدام هذه الباقة" في صفحة التفاصيل، نملأ كل الحقول بنفس اختيارات
  // الباقة الأصلية (نسخة جديدة قابلة للتعديل، من غير ما نلمس الباقة الأصلية في القاعدة)
  useEffect(() => {
    if (!initialData) return;
    const s = initialData.builder_state || {};
    setBusinessName(initialData.business_name || "");
    setBusinessType(initialData.business_type || "");
    setProjectName(initialData.package_name || "");
    setSavedName(initialData.package_name || "");
    setClientNotes(initialData.client_notes || "");
    setPkgId(s.pkgId ?? null);
    setPosts(initialData.posts_count || 0);
    setStories(initialData.stories_count || 0);
    setReels(initialData.reels_count || 0);
    setScripts(initialData.scripts_count || 0);
    setWebsites(s.websites || {});
    setIdentityOn(!!s.identityOn);
    setPlatforms(s.platforms || {});
    setLogo(s.logo || { on: false, tier: 0 });
    setBrand(s.brand || { on: false, tier: 0 });
    setSocialPages(s.socialPages || {});
    setAiVideo(s.aiVideo || { on: false, tier: "standard", qty: 1 });
    setAds(s.ads || {});
    setExtraScripts(s.extraScripts || 0);
    setExtraContent(s.extraContent || 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

  async function handleSavePackage() {
    if (saving) return;
    if (!pkg) {
      setSaveToast({ type: "error", text: "اختار باقة الأول قبل الحفظ." });
      return;
    }
    setSaving(true);
    try {
      await createPackage({
        business_name: businessName,
        business_type: businessType,
        package_name: savedName || projectName,
        base_package_id: pkg.id,
        base_package_tier: pkg.tier,
        posts_count: posts,
        stories_count: stories,
        reels_count: reels,
        scripts_count: scripts,
        base_price: pkg.price || 0,
        extras_price: packageAddonsTotal + extrasTotal,
        final_price: totalPrice,
        client_notes: clientNotes,
        builder_state: {
          pkgId, websites, identityOn, platforms, logo, brand,
          socialPages, aiVideo, ads, extraScripts, extraContent,
        },
      });
      setSaveToast({ type: "success", text: "✅ تم حفظ الباقة بنجاح." });
    } catch (e) {
      setSaveToast({ type: "error", text: e.message || "حدث خطأ أثناء الحفظ، حاول تاني." });
    } finally {
      setSaving(false);
    }
  }

  // إرسال الطلب: بيحفظ الباقة المخصصة (نفس منطق "حفظ الباقة") وبعدين يفتح
  // مودال الاشتراك (تسجيل دخول/حساب لو لازم) — عشان يتسجّل طلب اشتراك حقيقي
  // بحالة "قيد المراجعة" في لوحة السوبر أدمن (تبويب "الاشتراكات")، مش مجرد
  // رسالة واتساب عادية من غير أي أثر في النظام.
  async function handleSendRequest() {
    if (!pkg || sendingRequest) return;
    setSendingRequest(true);
    setSaveToast(null);
    try {
      const saved = await createPackage({
        business_name: businessName,
        business_type: businessType,
        package_name: savedName || projectName || `باقة ${pkg.tier}`,
        base_package_id: pkg.id,
        base_package_tier: pkg.tier,
        posts_count: posts,
        stories_count: stories,
        reels_count: reels,
        scripts_count: scripts,
        base_price: pkg.price || 0,
        extras_price: packageAddonsTotal + extrasTotal,
        final_price: totalPrice,
        client_notes: clientNotes,
        builder_state: {
          pkgId, websites, identityOn, platforms, logo, brand,
          socialPages, aiVideo, ads, extraScripts, extraContent,
        },
      });
      setSubscribePkg(saved);
    } catch (e) {
      setSaveToast({ type: "error", text: e.message || "تعذّر إرسال الطلب، حاول تاني." });
    } finally {
      setSendingRequest(false);
    }
  }

  function selectPackage(p) {
    setPkgId(p.id);
    setPosts(p.base.posts);
    setStories(p.base.stories);
    setReels(p.base.reels);
    setScripts(p.base.scripts);
  }

  function toggleWebsite(key) {
    setWebsites((w) => ({ ...w, [key]: { on: !w[key]?.on, tier: w[key]?.tier ?? 0 } }));
  }
  function setWebsiteTier(key, tier) {
    setWebsites((w) => ({ ...w, [key]: { ...w[key], tier } }));
  }
  function togglePlatform(name) {
    setPlatforms((p) => {
      const next = { ...p };
      if (next[name]) delete next[name];
      else next[name] = 1;
      return next;
    });
  }
  function setPlatformDesigns(name, qty) {
    setPlatforms((p) => ({ ...p, [name]: qty }));
  }
  function toggleSocialPage(key) {
    setSocialPages((s) => ({ ...s, [key]: !s[key] }));
  }
  function toggleAd(key) {
    setAds((a) => ({ ...a, [key]: !a[key] }));
  }

  // ---- pricing ----
  const websitesTotal = WEBSITE_OPTIONS.reduce((sum, w) => {
    const sel = websites[w.key];
    return sel?.on ? sum + w.tiers[sel.tier ?? 0] : sum;
  }, 0);

  const platformsDesignsTotal = Object.values(platforms).reduce((sum, qty) => sum + qty * BUILDER_UNIT_PRICE.designPerPlatform, 0);
  const logoTotal = logo.on ? LOGO_TIERS[logo.tier] : 0;
  const brandTotal = brand.on ? BRAND_TIERS[brand.tier] : 0;
  const identityTotal = identityOn ? platformsDesignsTotal + logoTotal + brandTotal : 0;

  const socialPagesTotal = Object.values(socialPages).filter(Boolean).length * SOCIAL_PAGE_PRICE;

  const aiVideoTier = AI_VIDEO_TIERS.find((t) => t.key === aiVideo.tier);
  const aiVideoTotal = aiVideo.on ? (aiVideoTier?.price || 0) * aiVideo.qty : 0;

  const adsTotal = ADS_OPTIONS.reduce((sum, a) => (ads[a.key] ? sum + a.price : sum), 0);

  const contentTotal = extraScripts * BUILDER_UNIT_PRICE.script + extraContent * BUILDER_UNIT_PRICE.content;

  const packageAddonsTotal = pkg
    ? Math.max(0, posts - pkg.base.posts) * BUILDER_UNIT_PRICE.post +
      Math.max(0, stories - pkg.base.stories) * BUILDER_UNIT_PRICE.story +
      Math.max(0, reels - pkg.base.reels) * BUILDER_UNIT_PRICE.reel +
      Math.max(0, scripts - pkg.base.scripts) * BUILDER_UNIT_PRICE.script
    : 0;

  const extrasTotal = websitesTotal + identityTotal + socialPagesTotal + aiVideoTotal + adsTotal + contentTotal;
  const totalPrice = (pkg?.price || 0) + packageAddonsTotal + extrasTotal;
  const animatedTotal = useCountUp(totalPrice);

  return (
    <div dir="rtl" style={{ background: "#060606", minHeight: "100vh", paddingTop: 110, paddingBottom: 60 }}>
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ===== Main column ===== */}
        <div className="lg:col-span-2" style={{ minWidth: 0 }}>
          <Reveal>
            <button
              onClick={() => setPage("home")}
              style={{ background: "none", border: "none", color: "#999", fontSize: 13, cursor: "pointer", marginBottom: 20, display: "flex", alignItems: "center", gap: 6 }}
            >
              → رجوع للرئيسية
            </button>
            <h1 style={{ fontFamily: "var(--font-cairo), sans-serif", fontSize: "clamp(26px,4vw,38px)", fontWeight: 900, color: "#fff", marginBottom: 8 }}>
              <GoldText>✨ خصص باقتك</GoldText>
            </h1>
            <p style={{ color: "#888", fontSize: 14, marginBottom: 30 }}>اختار احتياجاتك خطوة بخطوة، والسعر بيتحدث لحظياً</p>
          </Reveal>

          {/* Project name */}
          <Reveal>
            <BCard>
              <BSectionTitle icon="🎨">اسم الباقة</BSectionTitle>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="مثلاً: باقة مطعم السلطان"
                  style={{
                    flex: 1, minWidth: 200, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,150,58,0.2)",
                    borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 14, outline: "none",
                  }}
                />
                <button
                  onClick={() => setSavedName(projectName)}
                  style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: `linear-gradient(135deg,${GOLD},${GOLD2})`, color: "#000", fontWeight: 800, fontSize: 13, cursor: "pointer" }}
                >
                  حفظ الاسم
                </button>
              </div>
              {savedName && <p style={{ color: GOLD2, fontSize: 12, marginTop: 10 }}>✓ تم حفظ الاسم: {savedName}</p>}
            </BCard>
          </Reveal>

          {/* Business info (for saving the package) */}
          <Reveal>
            <BCard>
              <BSectionTitle icon="🏢">بيانات النشاط</BSectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 10 }}>
                <input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="اسم النشاط (مثلاً: مطعم السلطان)"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,150,58,0.2)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 14, outline: "none" }}
                />
                <input
                  list="business-type-options"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  placeholder="نوع النشاط (مطعم، كافيه، عيادة...)"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,150,58,0.2)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 14, outline: "none" }}
                />
                <datalist id="business-type-options">
                  <option value="مطعم" /><option value="كافيه" /><option value="عيادة" />
                  <option value="متجر إلكتروني" /><option value="صالون" /><option value="عقارات" />
                </datalist>
              </div>
              <textarea
                value={clientNotes}
                onChange={(e) => setClientNotes(e.target.value)}
                placeholder="ملاحظات إضافية (اختياري)"
                rows={3}
                style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,150,58,0.2)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 14, outline: "none", resize: "vertical" }}
              />
            </BCard>
          </Reveal>

          {/* Package selection */}
          <Reveal>
            <BCard>
              <BSectionTitle icon="📦">اختار الباقة</BSectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
                {BUILD_PACKAGES.map((p) => {
                  const isSel = pkgId === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => selectPackage(p)}
                      style={{
                        cursor: "pointer", textAlign: "center", padding: "18px 10px", borderRadius: 14,
                        border: `1.5px solid ${isSel ? p.color : "rgba(255,255,255,0.08)"}`,
                        background: isSel ? `${p.color}14` : "rgba(255,255,255,0.02)",
                        boxShadow: isSel ? `0 0 24px ${p.glow}` : "none",
                        transition: "all 0.25s",
                      }}
                    >
                      <div style={{ fontSize: 30, marginBottom: 6 }}>{p.icon}</div>
                      <div style={{ color: "#fff", fontWeight: 800, fontSize: 14, marginBottom: 4 }}>{p.tier}</div>
                      <div style={{ color: p.color, fontWeight: 900, fontSize: 16 }}>{p.price.toLocaleString()} ج.م</div>
                    </div>
                  );
                })}
              </div>
            </BCard>
          </Reveal>

          {/* Package customization */}
          {pkg && (
            <Reveal>
              <BCard>
                <BSectionTitle icon="⚙">تخصيص الباقة</BSectionTitle>
                <BCounter label="المنشورات" value={posts} onChange={setPosts} min={0} />
                <BCounter label="الستوري" value={stories} onChange={setStories} min={0} />
                <BCounter label="الريلز" value={reels} onChange={setReels} min={0} />
                <BCounter label="السكربتات" value={scripts} onChange={setScripts} min={0} />
                <p style={{ color: "#666", fontSize: 11, marginTop: 12 }}>
                  الكميات الأساسية داخلة ضمن سعر الباقة — أي زيادة عنها بيتضاف سعرها، والتقليل عن الأساسي مايخصمش من سعر الباقة.
                </p>
              </BCard>
            </Reveal>
          )}

          {/* Additional services */}
          {pkg && (
            <Reveal>
              <div>
                <h2 style={{ fontFamily: "var(--font-cairo), sans-serif", fontSize: 20, fontWeight: 900, color: "#fff", margin: "30px 0 16px" }}>
                  ➕ خدمات إضافية
                </h2>

                {/* Websites */}
                <BCard>
                  <BSectionTitle icon="🌐">المواقع</BSectionTitle>
                  {WEBSITE_OPTIONS.map((w) => (
                    <div key={w.key} style={{ marginBottom: 4 }}>
                      <BCheck label={`${w.icon} ${w.label}`} checked={!!websites[w.key]?.on} onChange={() => toggleWebsite(w.key)} />
                      {websites[w.key]?.on && (
                        <BTierPicker tiers={w.tiers} value={websites[w.key]?.tier ?? 0} onChange={(t) => setWebsiteTier(w.key, t)} />
                      )}
                    </div>
                  ))}
                </BCard>

                {/* Identity */}
                <BCard>
                  <BSectionTitle icon="🎨">الهوية البصرية</BSectionTitle>
                  <BCheck label="أريد تأسيس هوية بصرية" checked={identityOn} onChange={setIdentityOn} />
                  {identityOn && (
                    <div style={{ marginTop: 14 }}>
                      <p style={{ color: "#999", fontSize: 13, marginBottom: 10 }}>اختر المنصات المطلوبة</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                        {PLATFORM_LIST.map((name) => {
                          const sel = platforms[name] != null;
                          return (
                            <button
                              key={name}
                              onClick={() => togglePlatform(name)}
                              style={{
                                padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer",
                                border: `1px solid ${sel ? GOLD : "rgba(255,255,255,0.15)"}`,
                                background: sel ? "rgba(201,150,58,0.15)" : "transparent",
                                color: sel ? GOLD2 : "#999",
                              }}
                            >
                              {sel ? "☑" : "☐"} {name}
                            </button>
                          );
                        })}
                      </div>
                      {Object.keys(platforms).length > 0 && (
                        <div style={{ marginBottom: 10 }}>
                          {Object.keys(platforms).map((name) => (
                            <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                              <span style={{ color: "#ccc", fontSize: 13 }}>عدد التصميمات لـ {name}</span>
                              <select
                                value={platforms[name]}
                                onChange={(e) => setPlatformDesigns(name, Number(e.target.value))}
                                style={{ background: "#111", color: "#fff", border: "1px solid rgba(201,150,58,0.3)", borderRadius: 8, padding: "4px 10px", fontSize: 13 }}
                              >
                                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                                  <option key={n} value={n}>{n}</option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      )}
                      <BCheck label="تصميم Logo" checked={logo.on} onChange={(v) => setLogo((l) => ({ ...l, on: v }))} />
                      {logo.on && <BTierPicker tiers={LOGO_TIERS} value={logo.tier} onChange={(t) => setLogo((l) => ({ ...l, tier: t }))} />}
                      <BCheck label="Brand Identity كاملة" checked={brand.on} onChange={(v) => setBrand((b) => ({ ...b, on: v }))} />
                      {brand.on && <BTierPicker tiers={BRAND_TIERS} value={brand.tier} onChange={(t) => setBrand((b) => ({ ...b, tier: t }))} />}
                    </div>
                  )}
                </BCard>

                {/* Social pages */}
                <BCard>
                  <BSectionTitle icon="📱">صفحات التواصل</BSectionTitle>
                  {SOCIAL_PAGE_OPTIONS.map((s) => (
                    <BCheck key={s.key} label={s.label} checked={!!socialPages[s.key]} onChange={() => toggleSocialPage(s.key)} price={SOCIAL_PAGE_PRICE} />
                  ))}
                </BCard>

                {/* AI Video */}
                <BCard>
                  <BSectionTitle icon="🤖">الفيديوهات</BSectionTitle>
                  <BCheck label="فيديو AI" checked={aiVideo.on} onChange={(v) => setAiVideo((a) => ({ ...a, on: v }))} />
                  {aiVideo.on && (
                    <>
                      <BTierPicker tiers={AI_VIDEO_TIERS.map((t) => t.price)} value={AI_VIDEO_TIERS.findIndex((t) => t.key === aiVideo.tier)} onChange={(i) => setAiVideo((a) => ({ ...a, tier: AI_VIDEO_TIERS[i].key }))} />
                      <BCounter label="عدد الفيديوهات" value={aiVideo.qty} onChange={(v) => setAiVideo((a) => ({ ...a, qty: Math.max(1, v) }))} min={1} />
                    </>
                  )}
                </BCard>

                {/* Ads */}
                <BCard>
                  <BSectionTitle icon="📈">الإعلانات</BSectionTitle>
                  {ADS_OPTIONS.map((a) => (
                    <BCheck key={a.key} label={a.label} checked={!!ads[a.key]} onChange={() => toggleAd(a.key)} price={a.price} />
                  ))}
                  <p style={{ color: "#e8a13a", fontSize: 11, marginTop: 12 }}>
                    ⚠️ ميزانية الإعلانات لا تدخل ضمن السعر ويتم دفعها بواسطة العميل مباشرة.
                  </p>
                </BCard>

                {/* Content */}
                <BCard>
                  <BSectionTitle icon="📄">المحتوى</BSectionTitle>
                  <BCounter label={`كتابة سكربت (${BUILDER_UNIT_PRICE.script} ج.م)`} value={extraScripts} onChange={setExtraScripts} />
                  <BCounter label={`كتابة محتوى (${BUILDER_UNIT_PRICE.content} ج.م)`} value={extraContent} onChange={setExtraContent} />
                </BCard>
              </div>
            </Reveal>
          )}

          {!pkg && (
            <p style={{ color: "#777", fontSize: 14, textAlign: "center", marginTop: 20 }}>
              اختار باقة الأول عشان تظهرلك خيارات التخصيص والخدمات الإضافية ⬆
            </p>
          )}
        </div>

        {/* ===== Sticky summary ===== */}
        <div style={{ alignSelf: "start", position: "sticky", top: 100 }}>
          <div style={{ background: "linear-gradient(160deg,#120c02,#080602)", border: `1px solid rgba(201,150,58,0.3)`, borderRadius: 20, padding: "22px 20px", boxShadow: "0 12px 40px rgba(0,0,0,0.5)" }}>
            <h3 style={{ fontFamily: "var(--font-cairo), sans-serif", fontSize: 16, fontWeight: 900, color: GOLD2, marginBottom: 14 }}>💰 ملخص الطلب</h3>

            <div style={{ fontSize: 13, color: "#ccc", lineHeight: 2 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>اسم المشروع</span><span style={{ color: "#fff" }}>{savedName || "—"}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>الباقة</span><span style={{ color: "#fff" }}>{pkg ? pkg.tier : "—"}</span></div>
              {pkg && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>الكميات</span>
                  <span style={{ color: "#fff", fontSize: 11, textAlign: "left" }}>{posts} بوست / {stories} ستوري / {reels} ريلز / {scripts} سكربت</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>سعر الباقة</span><span style={{ color: "#fff" }}>{(pkg?.price || 0).toLocaleString()} ج.م</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>سعر الإضافات</span><span style={{ color: "#fff" }}>{(packageAddonsTotal + extrasTotal).toLocaleString()} ج.م</span></div>
            </div>

            <div style={{ borderTop: "1px solid rgba(201,150,58,0.2)", marginTop: 14, paddingTop: 14, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ color: "#999", fontSize: 13, fontWeight: 700 }}>الإجمالي</span>
              <span style={{ fontFamily: "var(--font-cinzel), serif", fontSize: 28, fontWeight: 900, color: GOLD3 }}>
                {animatedTotal.toLocaleString()} <span style={{ fontSize: 13, color: "#999" }}>ج.م</span>
              </span>
            </div>

            <button
              onClick={handleSavePackage}
              disabled={!pkg || saving}
              style={{
                display: "block", width: "100%", textAlign: "center", marginTop: 20, padding: "13px 0", borderRadius: 14,
                fontWeight: 800, fontSize: 14, border: `1.5px solid ${pkg ? GOLD : "rgba(255,255,255,0.1)"}`,
                background: "transparent",
                color: pkg ? GOLD2 : "#555",
                cursor: pkg && !saving ? "pointer" : "not-allowed",
              }}
            >
              {saving ? "جاري الحفظ..." : "💾 حفظ الباقة"}
            </button>

            <button
              type="button"
              onClick={handleSendRequest}
              disabled={!pkg || sendingRequest}
              style={{
                display: "block", width: "100%", textAlign: "center", marginTop: 10, padding: "14px 0", borderRadius: 14,
                fontWeight: 900, fontSize: 15, textDecoration: "none", border: "none",
                background: pkg ? `linear-gradient(135deg,${GOLD},${GOLD2})` : "rgba(255,255,255,0.06)",
                color: pkg ? "#000" : "#555",
                cursor: pkg && !sendingRequest ? "pointer" : "not-allowed",
                boxShadow: pkg ? "0 8px 28px rgba(201,150,58,0.35)" : "none",
              }}
            >
              {sendingRequest ? "جاري الإرسال..." : "🚀 إرسال الطلب"}
            </button>
            <p style={{ color: "#777", fontSize: 11, marginTop: 10, textAlign: "center", lineHeight: 1.7 }}>
              هيتسجّل طلبك بحالة "قيد المراجعة" وهيتفتح واتساب تلقائيًا بتفاصيل باقتك.
            </p>
          </div>
        </div>
      </div>
      <Toast toast={saveToast} onClose={() => setSaveToast(null)} />

      {subscribePkg && (
        <SubscribeModal
          pkg={subscribePkg}
          onClose={() => setSubscribePkg(null)}
          onSubscribed={() => { window.location.hash = "#dashboard"; }}
        />
      )}
    </div>
  );
}


function PricingSection({ setPage }) {
  const [active, setActive] = useState(null);
  const [subscribingPkg, setSubscribingPkg] = useState(null);
  const WA = WA_LINK;

  const packages = [
    {
      id: 1,
      icon: "🥉",
      tier: "الأساسية",
      price: "1,800",
      badge: null,
      color: "#CD7F32",
      glow: "rgba(205,127,50,0.35)",
      gradient: "linear-gradient(135deg,#1a1000,#2a1800)",
      features: [
        "8 بوستات احترافية",
        "8 ستوري",
        "كتابة المحتوى التسويقي",
        "جدولة المحتوى",
        "تعديلين لكل تصميم",
      ],
    },
    {
      id: 2,
      icon: "🥈",
      tier: "المتقدمة",
      price: "2,800",
      badge: null,
      color: "#C0C0C0",
      glow: "rgba(192,192,192,0.3)",
      gradient: "linear-gradient(135deg,#111111,#202020)",
      features: [
        "12 بوست احترافي",
        "12 ستوري",
        "كتابة المحتوى التسويقي",
        "2 فيديو ريلز احترافية بالذكاء الاصطناعي",
        "كتابة 2 سكربت تصوير للريلز",
        "تصميم العروض والخصومات",
        "إدارة الحملات الإعلانية الممولة (ميزانية الإعلانات على العميل)",
      ],
    },
    {
      id: 3,
      icon: "🥇",
      tier: "الاحترافية",
      price: "4,500",
      badge: "الأكثر طلباً",
      color: GOLD,
      glow: "rgba(201,150,58,0.45)",
      gradient: "linear-gradient(135deg,#1a1000,#2e1e00)",
      features: [
        "16 بوست احترافي",
        "20 ستوري",
        "كتابة المحتوى التسويقي",
        "4 فيديوهات ريلز بالذكاء الاصطناعي",
        "كتابة سكربتات الريلز والإعلانات",
        "خطة محتوى شهرية",
        "إدارة وتحسين الحملات الإعلانية (ميزانية الإعلانات على العميل)",
        "تقرير أداء شهري",
      ],
    },
    {
      id: 4,
      icon: "💎",
      tier: "الشاملة",
      price: "6,500",
      badge: null,
      color: "#6ee7f7",
      glow: "rgba(110,231,247,0.3)",
      gradient: "linear-gradient(135deg,#001520,#002030)",
      features: [
        "20 بوست احترافي",
        "30 ستوري",
        "كتابة المحتوى التسويقي",
        "8 فيديوهات ريلز بالذكاء الاصطناعي",
        "كتابة سكربتات الريلز والإعلانات",
        "خطة تسويقية شهرية",
        "إدارة جميع منصات التواصل الاجتماعي",
        "إدارة وتحسين الحملات الإعلانية (ميزانية الإعلانات على العميل)",
        "تقرير وتحليل أداء شهري",
      ],
    },
  ];

  const extras = [
    { label: "Landing Page", price: "2,500 – 3,500 جنيه" },
    { label: "موقع شركة احترافي", price: "4,500 – 7,000 جنيه" },
    { label: "متجر إلكتروني", price: "6,000 – 10,000 جنيه" },
    { label: "منيو إلكتروني QR للمطاعم", price: "1,500 – 3,000 جنيه" },
    { label: "إنشاء صفحة فيسبوك / إنستجرام", price: "500 جنيه" },
    { label: "ربط الصفحة بـ Meta Business", price: "500 جنيه" },
    { label: "تصميم لوجو احترافي", price: "800 – 2,000 جنيه" },
    { label: "هوية بصرية كاملة", price: "3,000 – 8,000 جنيه" },
    { label: "فيديو تسويقي بالذكاء الاصطناعي", price: "400 – 1,500 جنيه" },
    { label: "سكربت ريلز احترافي", price: "250 جنيه" },
    { label: "إعلان ممول (Ad Copy)", price: "300 جنيه" },
    { label: "إنشاء وإدارة حملة إعلانية شهرية", price: "1,500 جنيه / شهر" },
  ];

  return (
    <section id="pricing" dir="rtl" style={{ background: "transparent", padding: "90px 0 80px", position: "relative", overflow: "hidden" }}>
      {/* Background glow orbs */}
      <div style={{ position: "absolute", top: "10%", left: "5%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,150,58,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "10%", right: "5%", width: 350, height: 350, borderRadius: "50%", background: "radial-gradient(circle, rgba(110,231,247,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-14">
          <p style={{ color: GOLD2, fontSize: 13, letterSpacing: 6, fontWeight: 700, textTransform: "uppercase", marginBottom: 10 }}>PRICING PLANS</p>
          <h2 style={{ fontFamily: "var(--font-cairo), sans-serif", fontSize: "clamp(28px,5vw,44px)", fontWeight: 900, color: "#fff", marginBottom: 14, lineHeight: 1.2 }}>
            اختار الباقة اللي تناسبك
          </h2>
          <div style={{ width: 60, height: 3, background: `linear-gradient(90deg,transparent,${GOLD},transparent)`, margin: "0 auto 16px" }} />
          <p style={{ color: "#888", fontSize: 15, maxWidth: 520, margin: "0 auto" }}>
            باقات مصممة خصيصاً لكل نوع أعمال — من البداية للاحتراف الكامل
          </p>
        </div>

        {/* Cards Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 22, marginBottom: 60 }}>
          {packages.map((pkg) => {
            const isActive = active === pkg.id;
            const isFeatured = pkg.badge === "الأكثر طلباً";
            return (
              <div
                key={pkg.id}
                onClick={() => setActive(isActive ? null : pkg.id)}
                style={{
                  background: pkg.gradient,
                  border: `1.5px solid ${isActive || isFeatured ? pkg.color : "rgba(255,255,255,0.07)"}`,
                  borderRadius: "var(--radius-md)",
                  padding: "28px 22px 24px",
                  position: "relative",
                  cursor: "pointer",
                  transition: "all 0.35s cubic-bezier(.4,0,.2,1)",
                  boxShadow: isActive || isFeatured ? `0 0 40px ${pkg.glow}, 0 8px 32px rgba(0,0,0,0.5)` : "0 4px 20px rgba(0,0,0,0.4)",
                  transform: isActive ? "translateY(-6px) scale(1.02)" : isFeatured ? "translateY(-3px)" : "none",
                  overflow: "hidden",
                }}
              >
                {/* Shimmer line at top */}
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${pkg.color},transparent)`, opacity: isActive || isFeatured ? 1 : 0.4 }} />

                {pkg.badge && (
                  <div style={{ position: "absolute", top: 14, left: 14, background: `linear-gradient(135deg,${pkg.color},${pkg.color}aa)`, color: "#000", fontSize: 10, fontWeight: 900, padding: "3px 10px", borderRadius: 20, letterSpacing: 1 }}>
                    {pkg.badge}
                  </div>
                )}

                <div style={{ textAlign: "center", marginBottom: 18 }}>
                  <div style={{ fontSize: 38, marginBottom: 6 }}>{pkg.icon}</div>
                  <h3 style={{ fontFamily: "var(--font-cairo), sans-serif", fontSize: 19, fontWeight: 900, color: "#fff", marginBottom: 4 }}>
                    باقة {pkg.tier}
                  </h3>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 4 }}>
                    <span style={{ fontFamily: "var(--font-cinzel), serif", fontSize: 30, fontWeight: 900, color: pkg.color }}>{pkg.price}</span>
                    <span style={{ color: "#666", fontSize: 12 }}>جنيه / شهر</span>
                  </div>
                </div>

                <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16 }}>
                  {pkg.features.map((f, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 9 }}>
                      <span style={{ color: pkg.color, fontSize: 13, flexShrink: 0, marginTop: 2 }}>✓</span>
                      <span style={{ color: "#ccc", fontSize: 13, lineHeight: 1.5 }}>{f}</span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSubscribingPkg({
                      package_name: `باقة ${pkg.tier}`,
                      business_name: "",
                      final_price: Number(String(pkg.price).replace(/[^\d.]/g, "")) || 0,
                    });
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "center",
                    marginTop: 20,
                    padding: "10px 0",
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 800,
                    textDecoration: "none",
                    background: isFeatured || isActive ? `linear-gradient(135deg,${pkg.color}cc,${pkg.color})` : "rgba(255,255,255,0.04)",
                    color: isFeatured || isActive ? "#000" : pkg.color,
                    border: `1px solid ${pkg.color}55`,
                    letterSpacing: 0.5,
                    cursor: "pointer",
                    transition: "all 0.25s",
                  }}
                >
                  تواصل معانا الآن 🚀
                </button>
              </div>
            );
          })}
        </div>

        {/* Build Your Package CTA */}
        <div className="text-center" style={{ marginBottom: 60 }}>
          <button
            onClick={() => { setPage && setPage("builder"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "16px 44px",
              borderRadius: 50,
              border: "none",
              cursor: "pointer",
              background: `linear-gradient(135deg,${GOLD},${GOLD2})`,
              color: "#000",
              fontFamily: "var(--font-cairo), sans-serif",
              fontSize: 16,
              fontWeight: 900,
              letterSpacing: 0.5,
              boxShadow: "0 8px 32px rgba(201,150,58,0.4)",
              transition: "transform 0.25s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
          >
            ✨ خصص باقتك
          </button>
        </div>

        {/* Extras Section */}
        <div style={{ borderTop: "1px solid rgba(201,150,58,0.15)", paddingTop: 50 }}>
          <div className="text-center mb-10">
            <h3 style={{ fontFamily: "var(--font-cairo), sans-serif", fontSize: 22, fontWeight: 900, color: GOLD2, marginBottom: 6 }}>
              ✨ خدمات إضافية
            </h3>
            <p style={{ color: "#666", fontSize: 13 }}>خارج نطاق الباقات — حسب الطلب</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            {extras.map((ex, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(201,150,58,0.12)", borderRadius: 14, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "all 0.25s" }}>
                <span style={{ color: "#ddd", fontSize: 13, fontWeight: 600 }}>{ex.label}</span>
                <span style={{ color: GOLD, fontSize: 13, fontWeight: 800, whiteSpace: "nowrap", marginRight: 12 }}>{ex.price}</span>
              </div>
            ))}
          </div>
          <p style={{ color: "#666", fontSize: 12, marginTop: 18, textAlign: "center" }}>
            ⚠️ ميزانية الإعلانات الممولة لا تشمل سعر الخدمة، ويتم دفعها مباشرة من قبل العميل على حساب Meta.
          </p>
        </div>

        {/* CTA Banner */}
        <div style={{ marginTop: 60, background: `linear-gradient(135deg,rgba(201,150,58,0.08),rgba(201,150,58,0.04))`, border: "1px solid rgba(201,150,58,0.2)", borderRadius: 20, padding: "36px 32px", textAlign: "center", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 500, height: 200, background: "radial-gradient(ellipse, rgba(201,150,58,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
          <p style={{ color: GOLD3, fontSize: 14, fontWeight: 700, marginBottom: 8, letterSpacing: 2 }}>🍔 عرض خاص</p>
          <h3 style={{ fontFamily: "var(--font-cairo), sans-serif", fontSize: "clamp(18px,3vw,26px)", fontWeight: 900, color: "#fff", marginBottom: 10, lineHeight: 1.4 }}>
            "ابدأ معنا شهر تجريبي وشاهد الفرق في شكل البراند ومحتواك التسويقي"
          </h3>
          <p style={{ color: "#888", fontSize: 13, marginBottom: 22 }}>مناسب للمطاعم والكافيهات اللي عايزة ترفع المبيعات وتطور شكل السوشيال ميديا بتاعتها</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {["🔥 تصميمات توقف العميل", "💡 إبراز نقاط قوة المنتجات", "🎨 الحفاظ على هوية البراند", "📈 زيادة التفاعل والوصول"].map((t, i) => (
              <span key={i} style={{ background: "rgba(201,150,58,0.1)", border: "1px solid rgba(201,150,58,0.2)", borderRadius: 20, padding: "5px 14px", color: GOLD2, fontSize: 12, fontWeight: 600 }}>{t}</span>
            ))}
          </div>
          <a href={WA_LINK} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 24, padding: "13px 36px", background: `linear-gradient(135deg,${GOLD},${GOLD2})`, color: "#000", borderRadius: 50, fontSize: 14, fontWeight: 900, textDecoration: "none", boxShadow: `0 6px 28px rgba(201,150,58,0.4)`, letterSpacing: 0.5 }}>
            ابدأ الباقة التجريبية 🚀
          </a>
        </div>
      </div>

      {subscribingPkg && (
        <SubscribeModal
          pkg={subscribingPkg}
          onClose={() => setSubscribingPkg(null)}
          onSubscribed={() => { window.location.hash = "#dashboard"; }}
        />
      )}
    </section>
  );
}

function WhySection() {
  return (
    <section id="why" dir="rtl" className="py-24 px-6 md:px-16" style={{ background: "transparent" }}>
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-16">
        <Reveal className="flex-shrink-0">
          <div className="relative w-52 h-52 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2" style={{ borderColor: "rgba(201,150,58,0.15)", animation: "spin-slow 20s linear infinite" }} />
            <div className="absolute rounded-full border" style={{ inset: 20, borderColor: "rgba(201,150,58,0.08)" }} />
            <div className="relative z-10 text-center">
              <div className="text-6xl font-black" style={{ fontFamily: "var(--font-cinzel), serif", background: `linear-gradient(135deg, ${GOLD}, ${GOLD3})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>A</div>
              <div className="text-xs tracking-widest font-bold" style={{ color: "#555", letterSpacing: 3 }}>MARKETING</div>
            </div>
          </div>
        </Reveal>
        <div>
          <Reveal>
            <SectionLabel>WHY US</SectionLabel>
            <h2 className="text-3xl md:text-4xl font-black tracking-wide mb-8 text-white" style={{ fontFamily: "var(--font-cinzel), serif" }}>لماذا تختار Abdullah Marketing؟</h2>
          </Reveal>
          <div className="space-y-6">
            {whyPoints.map((p, i) => (
              <Reveal key={i} delay={i * 55}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: "rgba(201,150,58,0.1)", border: "1px solid rgba(201,150,58,0.2)" }}>{p.icon}</div>
                  <div>
                    <h4 className="font-bold text-white mb-1 text-sm">{p.title}</h4>
                    <p className="text-xs leading-relaxed" style={{ color: "#666" }}>{p.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={200}>
            <a href={WA_LINK} target="_blank" rel="noreferrer" className="inline-block mt-8 font-black px-8 py-3 rounded-xl text-black text-sm transition duration-300 hover:-translate-y-1" style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD2})`, boxShadow: "0 4px 30px rgba(201,150,58,0.3)" }}>
              💬 تكلم معايا دلوقتي
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function ProcessSection() {
  return (
    <section id="process" dir="rtl" className="py-24 px-6 md:px-10" style={{ background: "transparent" }}>
      <Reveal className="text-center mb-16">
        <SectionLabel>HOW WE WORK</SectionLabel>
        <h2 className="text-3xl md:text-4xl font-black tracking-wide mb-3 text-white" style={{ fontFamily: "var(--font-cinzel), serif" }}>آلية العمل</h2>
        <p className="text-sm text-gray-500">أربع خطوات من التواصل الأول حتى النتائج</p>
      </Reveal>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto relative">
        <div className="absolute hidden md:block" style={{ top: 38, right: "10%", left: "10%", height: 1, background: "linear-gradient(90deg,transparent,#2A2A2A,#2A2A2A,transparent)" }} />
        {steps.map((s, i) => (
          <Reveal key={i} delay={i * 55}>
            <div className="text-center group">
              <div className="relative w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center text-2xl transition duration-300 group-hover:scale-105" style={{ background: "#161616", border: "1px solid #2A2A2A" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = GOLD; e.currentTarget.style.background = "rgba(201,150,58,0.07)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#2A2A2A"; e.currentTarget.style.background = "#161616"; }}>
                <span className="text-2xl">{s.icon}</span>
                <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black" style={{ background: GOLD, color: "#000", fontFamily: "var(--font-cinzel), serif" }}>{s.n}</span>
              </div>
              <h4 className="text-sm font-bold text-white mb-2">{s.title}</h4>
              <p className="text-xs leading-relaxed" style={{ color: "#666" }}>{s.desc}</p>
            </div>
          </Reveal>
        ))}
      </div>
      <Reveal className="text-center mt-14">
        <a href={WA_LINK} target="_blank" rel="noreferrer" className="inline-block font-black px-10 py-4 rounded-xl text-black text-sm transition duration-300 hover:-translate-y-1" style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD2})`, boxShadow: "0 4px 30px rgba(201,150,58,0.3)" }}>
          🚀 ابدأ مشروعك الآن
        </a>
      </Reveal>
    </section>
  );
}

const caseStudyServices = [
  { icon: "💻", label: "تصميم وتطوير موقع إلكتروني احترافي" },
  { icon: "🎨", label: "تصميم واجهة وتجربة المستخدم (UI/UX)" },
  { icon: "📖", label: "إنشاء منيو رقمي احترافي" },
  { icon: "📱", label: "دمج QR Code للوصول السريع للمنيو" },
  { icon: "💬", label: "ربط الطلبات عبر WhatsApp" },
  { icon: "📐", label: "تصميم متجاوب مع الهاتف والتابلت والكمبيوتر" },
  { icon: "⚡", label: "تحسين سرعة وأداء الموقع" },
  { icon: "🗂️", label: "تنظيم وتصميم أقسام المنيو" },
  { icon: "🚀", label: "نشر الموقع واستضافته" },
  { icon: "✨", label: "تحسين الهوية الرقمية للمطعم" },
];

function FeaturedProjectSection() {
  return (
    <section id="case-study" dir="rtl" aria-labelledby="case-study-heading" className="py-24 px-6 md:px-10" style={{ background: "transparent" }}>
      <Reveal className="text-center mb-6">
        <SectionLabel>FEATURED CASE STUDY</SectionLabel>
        <h2 id="case-study-heading" className="text-3xl md:text-4xl font-black tracking-wide mb-3 text-white" style={{ fontFamily: "var(--font-cinzel), serif" }}>آخر أعمالنا</h2>
        <p className="text-sm text-gray-500 leading-relaxed max-w-md mx-auto">دراسة حالة كاملة توضح كيف حوّلنا فكرة مطعم إلى تجربة رقمية متكاملة</p>
      </Reveal>

      <Reveal>
        <div className="max-w-5xl mx-auto rounded-3xl overflow-hidden border relative" style={{ background: "#161616", borderColor: "rgba(201,150,58,0.25)" }}>
          <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="relative h-64 lg:h-full min-h-[280px] overflow-hidden flex flex-col" style={{ background: "#0A0A0A" }}>
              <div className="flex items-center gap-2 px-4 py-2.5 flex-shrink-0" style={{ background: "#1A1A1A", borderBottom: "1px solid #2A2A2A" }}>
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#FF5F56" }} />
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#FFBD2E" }} />
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#27C93F" }} />
                <span dir="ltr" className="ms-3 text-xs px-3 py-1 rounded-full truncate" style={{ background: "#111", color: "#777", border: "1px solid #2A2A2A" }}>
                  lacasa-de-burger-website.vercel.app
                </span>
              </div>
              <div className="relative flex-1 overflow-hidden">
                <Image src={IMG_LCDB_WEBSITE} alt="لقطة شاشة من الموقع الرسمي لـ La Casa De Burger" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover object-top" />
                <div className="absolute inset-0" style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.7), transparent 40%)" }} />
                <div className="absolute bottom-4 right-4 text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: "rgba(201,150,58,0.95)", color: "#000" }}>
                  Restaurant Website & Digital Menu
                </div>
              </div>
            </div>

            <div className="p-8 md:p-10">
              <div className="text-xs font-bold tracking-widest mb-2" style={{ color: GOLD }}>CASE STUDY</div>
              <h3 className="text-2xl font-black text-white mb-4" style={{ fontFamily: "var(--font-cinzel), serif" }}>La Casa De Burger</h3>
              <p className="text-sm leading-relaxed mb-6" style={{ color: "#999" }}>
                قمنا بتصميم وتطوير موقع إلكتروني احترافي لمطعم La Casa De Burger بهدف تقديم تجربة رقمية حديثة للعملاء، مع عرض المنيو بشكل منظم، وسهولة الوصول للطلبات عبر QR Code وWhatsApp، مع الحفاظ على الهوية البصرية للمطعم وتحسين تجربة المستخدم على جميع الأجهزة.
              </p>

              <div className="flex flex-wrap gap-3 mb-8">
                <a href="https://lacasa-de-burger-website.vercel.app/" target="_blank" rel="noreferrer" className="inline-block font-black px-6 py-3 rounded-xl text-black text-sm transition duration-300 hover:-translate-y-1" style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD2})`, boxShadow: "0 4px 30px rgba(201,150,58,0.3)" }}>
                  🌐 زيارة الموقع
                </a>
                <a href={WA_LINK} target="_blank" rel="noreferrer" className="inline-block font-bold px-6 py-3 rounded-xl text-sm transition duration-300 border" style={{ color: GOLD, borderColor: "rgba(201,150,58,0.4)" }}>
                  ابدأ مشروع مشابه
                </a>
              </div>

              <h4 className="text-xs font-bold tracking-widest mb-4" style={{ color: "#666" }}>الخدمات المقدمة</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {caseStudyServices.map((s, i) => (
                  <Reveal key={i} delay={i * 35}>
                    <div className="flex items-center gap-3 rounded-xl p-3 border transition duration-300 hover:-translate-y-0.5" style={{ background: "#1A1A1A", borderColor: "#2A2A2A" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = GOLD; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "#2A2A2A"; }}>
                      <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0" style={{ background: "rgba(201,150,58,0.1)", border: "1px solid rgba(201,150,58,0.2)" }}>{s.icon}</span>
                      <span className="text-xs font-semibold" style={{ color: "#ccc" }}>{s.label}</span>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

// Testimonial note: quote below reflects the client-approved feedback text.
// If this has not yet been signed off by La Casa De Burger, swap it for the
// placeholder text left commented at the bottom of this file before publishing.
const testimonial = {
  client: "La Casa De Burger",
  quote: "ساعدنا عبدالله في تصميم موقع احترافي يعرض المنيو بشكل أفضل وسهّل وصول العملاء للطلبات عبر QR Code. التجربة كانت ممتازة والتعامل احترافي.",
  img: IMG_LCDB_13,
};
// Placeholder fallback if the quote above is not yet confirmed by the client:
// const testimonial = { client: "La Casa De Burger", quote: "[بانتظار رأي معتمد من العميل — يُستبدل هذا النص قبل نشر الموقع]", img: IMG_LCDB_13 };

function TestimonialsSection() {
  return (
    <section id="testimonials" dir="rtl" aria-labelledby="testimonials-heading" className="py-24 px-6 md:px-10" style={{ background: "transparent" }}>
      <Reveal className="text-center mb-14">
        <SectionLabel>CLIENT VOICE</SectionLabel>
        <h2 id="testimonials-heading" className="text-3xl md:text-4xl font-black tracking-wide mb-3 text-white" style={{ fontFamily: "var(--font-cinzel), serif" }}>آراء العملاء</h2>
        <p className="text-sm text-gray-500 leading-relaxed max-w-md mx-auto">ثقة عملائنا هي أكبر دليل على جودة العمل</p>
      </Reveal>

      <Reveal>
        <div className="max-w-2xl mx-auto rounded-3xl p-8 md:p-10 border relative text-center transition duration-300 hover:-translate-y-1" style={{ background: "#161616", borderColor: "rgba(201,150,58,0.25)", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
          <div className="text-4xl mb-4" style={{ color: GOLD, opacity: 0.6 }} aria-hidden="true">❝</div>

          <p className="text-sm md:text-base leading-relaxed mb-6" style={{ color: "#ddd" }}>{testimonial.quote}</p>

          <div className="flex items-center justify-center gap-1 mb-6" aria-label="تقييم خمس نجوم" role="img">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} style={{ color: GOLD }}>★</span>
            ))}
          </div>

          <div className="flex items-center justify-center gap-3">
            <div className="relative w-14 h-14 rounded-full overflow-hidden flex-shrink-0" style={{ border: `2px solid ${GOLD}`, boxShadow: "0 0 20px rgba(201,150,58,0.3)" }}>
              <Image src={testimonial.img} alt={`${testimonial.client} logo`} fill sizes="56px" className="object-cover" />
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-white">{testimonial.client}</div>
              <div className="text-xs" style={{ color: "#666" }}>La Casa De Burger — Restaurant</div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function AboutPage({ setPage }) {
  const [cvOpen, setCvOpen] = useState(false);
  const [testimonialsList, setTestimonialsList] = useState([]);

  useEffect(() => {
    fetchVisibleTestimonials()
      .then(setTestimonialsList)
      .catch(() => setTestimonialsList([]));
  }, []);

  const details = [
    { icon: "📍", label: "LOCATION", value: "أسيوط، مصر" },
    { icon: "🎯", label: "SPECIALTY", value: "Social Media Marketing" },
    { icon: "📚", label: "STATUS", value: "متعلم ومتطور باستمرار" },
    { icon: "🌍", label: "SERVING", value: "أسيوط والمناطق المجاورة" },
    { icon: "⚡", label: "FOCUS", value: "مطاعم · فاشن · أعمال" },
  ];
  return (
    <div dir="rtl" style={{ background: "#060606", minHeight: "100vh" }}>
      <div className="text-center px-6 pt-36 pb-20 relative overflow-hidden" style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #060606 100%)" }}>
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ width: 600, height: 400, background: "radial-gradient(ellipse, rgba(201,150,58,0.08) 0%, transparent 65%)" }} />
        <div className="w-28 h-28 rounded-full mx-auto mb-6 relative overflow-hidden" style={{ border: `2px solid ${GOLD}`, boxShadow: "0 0 40px rgba(201,150,58,0.2)" }}>
          <Image src={IMG_AVATAR} alt="Abdullah Diaa" fill sizes="112px" priority className="object-cover" />
        </div>
        <h1 className="text-3xl md:text-4xl font-black tracking-widest mb-1" style={{ fontFamily: "var(--font-cinzel), serif", color: GOLD }}>ABDULLAH DIAA</h1>
        <p className="text-sm tracking-widest font-bold mb-3" style={{ color: "#555", letterSpacing: 4 }}>SOCIAL MEDIA MARKETING SPECIALIST</p>
        <p className="text-sm" style={{ color: "#666" }}>📍 أسيوط، مصر</p>
        <a href="https://www.instagram.com/3bdullah.dyaa?igsh=MTFnMDM4NHUxemc3cQ==" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 mt-5 px-5 py-2 rounded-full text-sm font-bold transition duration-300 hover:scale-105" style={{ background: "linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)", color: "#fff", boxShadow: "0 4px 20px rgba(131,58,180,0.3)" }}>
          📸 تابعني على إنستقرام @3bdullah.dyaa
        </a>
        <div>
          <button onClick={() => setCvOpen(true)} className="inline-flex items-center gap-2 mt-4 px-5 py-2 rounded-full text-sm font-bold transition duration-300 hover:scale-105 border" style={{ borderColor: GOLD, color: GOLD, background: "rgba(201,150,58,0.06)" }}>
            📄 عرض السيرة الذاتية (CV)
          </button>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
          <Reveal>
            <div className="rounded-2xl p-8 border" style={{ background: "#0E0E0E", borderColor: "#2A2A2A" }}>
              <div className="flex items-center gap-2 mb-5 text-xs font-bold tracking-widest" style={{ color: GOLD }}>✦ من أنا</div>
              <p className="text-sm leading-loose mb-4" style={{ color: "#bbb" }}>أنا <strong className="text-white">عبدالله ضياء الدين</strong>، متخصص في التسويق عبر منصات السوشيال ميديا من أسيوط، مصر. عمري ٢٠ سنة وبدأت رحلتي في عالم الماركتنج بشغف حقيقي وإرادة قوية للتعلم والتطور.</p>
              <p className="text-sm leading-loose mb-4" style={{ color: "#bbb" }}>بؤمن إن <strong className="text-white">البداية الصح</strong> هي أقوى خطوة — وأنا بنيت مهاراتي على أساس متين من التعلم العملي والتطبيق الفعلي.</p>
              <p className="text-sm leading-loose" style={{ color: "#bbb" }}>رحلتي لسه في بدايتها، بس <strong className="text-white">الطموح كبير والهدف واضح:</strong> أكون مرجعاً موثوقاً لأصحاب الأعمال في منطقتنا.</p>
            </div>
          </Reveal>
          <Reveal delay={60}>
            <div className="space-y-3">
              {details.map((d, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl border" style={{ background: "#0E0E0E", borderColor: "#2A2A2A" }}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0" style={{ background: "rgba(201,150,58,0.1)", border: "1px solid rgba(201,150,58,0.2)" }}>{d.icon}</div>
                  <div>
                    <span className="block text-xs font-bold tracking-widest mb-0.5" style={{ color: "#555" }}>{d.label}</span>
                    <strong className="text-sm text-white font-bold">{d.value}</strong>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
        <Reveal>
          <div className="rounded-2xl p-8 border mb-10" style={{ background: "linear-gradient(135deg, rgba(201,150,58,0.06), rgba(201,150,58,0.02))", borderColor: "rgba(201,150,58,0.2)" }}>
            <h3 className="text-lg font-black text-white mb-3" style={{ fontFamily: "var(--font-cinzel), serif" }}>🌟 رؤيتي</h3>
            <p className="text-sm leading-loose" style={{ color: "#888" }}>أؤمن أن كل مشروع صغير يستحق حضوراً رقمياً احترافياً — هدفي إن كل صاحب عمل في أسيوط يلاقي في Abdullah Marketing الشريك الموثوق اللي يساعده ينمو ويوصل لجمهوره الصح بأقل تكلفة وأعلى تأثير.</p>
          </div>
        </Reveal>

        {/* ===== المهارات والخدمات (من السيرة الذاتية) ===== */}
        <Reveal>
          <div className="mb-3 text-xs font-bold tracking-widest text-center" style={{ color: GOLD }}>✦ خبراتي</div>
          <h3 className="text-2xl font-black text-white text-center mb-10" style={{ fontFamily: "var(--font-cinzel), serif" }}>مجالات التخصص</h3>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-12">
          {[
            { icon: "📱", title: "التسويق الرقمي", items: ["إدارة صفحات السوشيال ميديا", "إعداد استراتيجيات التسويق", "إنشاء الحملات الإعلانية على Meta", "تحليل الأداء وزيادة المبيعات"] },
            { icon: "💻", title: "تصميم وتطوير المواقع", items: ["تصميم مواقع إلكترونية وشركات", "مواقع منيو رقمية للمطاعم (QR)", "تصميم صفحات هبوط (Landing Pages)", "تجربة استخدام متجاوبة مع كل الأجهزة"] },
            { icon: "🤖", title: "صناعة المحتوى بالذكاء الاصطناعي", items: ["إنتاج فيديوهات Reels احترافية", "صور وبروموتات إعلانية بالـ AI", "تحسين الصور والفيديوهات", "محتوى متوافق مع الهوية البصرية"] },
            { icon: "🎨", title: "الهوية البصرية والجرافيك", items: ["تصميم الشعارات (Logos)", "بناء الهوية البصرية الكاملة", "بوستات وStories وCarousels", "تصميم الإعلانات الإبداعية"] },
          ].map((cat, i) => (
            <Reveal key={i} delay={i * 50}>
              <div className="rounded-2xl p-6 border h-full" style={{ background: "#0E0E0E", borderColor: "#2A2A2A" }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0" style={{ background: "rgba(201,150,58,0.1)", border: "1px solid rgba(201,150,58,0.2)" }}>{cat.icon}</div>
                  <strong className="text-white font-bold text-sm">{cat.title}</strong>
                </div>
                <ul className="space-y-2">
                  {cat.items.map((it, j) => (
                    <li key={j} className="text-xs flex items-start gap-2" style={{ color: "#999" }}>
                      <span style={{ color: GOLD }}>•</span>{it}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>

        {/* ===== الشهادات ===== */}
        <Reveal>
          <div className="mb-3 text-xs font-bold tracking-widest text-center" style={{ color: GOLD }}>✦ الشهادات</div>
          <h3 className="text-2xl font-black text-white text-center mb-10" style={{ fontFamily: "var(--font-cinzel), serif" }}>شهادات معتمدة</h3>
        </Reveal>
        {testimonialsList.map((t) => (
          <Reveal key={t.id}>
            <div className="rounded-2xl p-6 md:p-8 border mb-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-center" style={{ background: "#0E0E0E", borderColor: "#2A2A2A" }}>
              {t.image_url && (
                <img
                  src={t.image_url}
                  alt={t.certificate_name}
                  loading="lazy"
                  className="w-full rounded-xl border"
                  style={{ borderColor: "rgba(201,150,58,0.25)" }}
                />
              )}
              <div>
                <strong className="block text-white font-bold text-base mb-2">{t.certificate_name}</strong>
                {t.description && (
                  <p className="text-sm leading-loose mb-3" style={{ color: "#999" }}>{t.description}</p>
                )}
                <div className="flex items-center gap-2 text-xs font-bold" style={{ color: GOLD }}>
                  <span>🏛️</span> {t.issuer}
                </div>
                {t.verify_url && (
                  <a href={t.verify_url} target="_blank" rel="noreferrer" className="inline-block mt-3 text-xs font-bold underline" style={{ color: GOLD3 }}>
                    🔗 التحقق من الشهادة
                  </a>
                )}
              </div>
            </div>
          </Reveal>
        ))}
        <div className="mb-6" />

        <div className="text-center">
          <a href={WA_LINK} target="_blank" rel="noreferrer" className="inline-block font-black px-10 py-4 rounded-xl text-black text-sm transition duration-300 hover:-translate-y-1" style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD2})`, boxShadow: "0 4px 30px rgba(201,150,58,0.3)" }}>
            تواصل معي الآن 🚀
          </a>
        </div>
      </div>

      {cvOpen && (
        <div
          className="fixed inset-0 z-[999] flex items-start justify-center overflow-y-auto p-4 md:p-10"
          style={{ background: "rgba(0,0,0,0.9)" }}
          onClick={() => setCvOpen(false)}
        >
          <div
            className="max-w-5xl w-full my-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5 px-2">
              <h3 className="text-lg md:text-xl font-black text-white" style={{ fontFamily: "var(--font-cinzel), serif" }}>السيرة الذاتية — عبدالله ضياء الدين</h3>
              <button
                onClick={() => setCvOpen(false)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.1)" }}
                aria-label="إغلاق"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-center text-xs font-bold tracking-widest mb-3" style={{ color: GOLD }}>النسخة العربية</div>
                <img src="/cv-ar.jpg" alt="السيرة الذاتية - عربي" loading="lazy" decoding="async" className="w-full rounded-xl border" style={{ borderColor: "rgba(201,150,58,0.3)" }} />
              </div>
              <div>
                <div className="text-center text-xs font-bold tracking-widest mb-3" style={{ color: GOLD }}>English Version</div>
                <img src="/cv-en.jpg" alt="CV - English" loading="lazy" decoding="async" className="w-full rounded-xl border" style={{ borderColor: "rgba(201,150,58,0.3)" }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ContactPage() {
  const contacts = [
    { href: WA_LINK, icon: "📲", label: "WHATSAPP", name: "واتساب — 01069032563", colorBg: "rgba(37,211,102,0.1)" },
    { href: "https://www.facebook.com/share/1DwbCov7zr/", icon: "📘", label: "FACEBOOK PAGE", name: "صفحة فيسبوك الرسمية", colorBg: "rgba(24,119,242,0.1)" },
    { href: "https://www.instagram.com/3bdullah.marketing?igsh=MTEzMXFiZTh2cG81cQ==", icon: "📸", label: "INSTAGRAM BUSINESS", name: "@3bdullah.marketing", colorBg: "rgba(228,64,95,0.1)" },
    { href: "https://www.instagram.com/3bdullah.dyaa?igsh=MTFnMDM4NHUxemc3cQ==", icon: "🌟", label: "INSTAGRAM PERSONAL", name: "@3bdullah.dyaa", colorBg: "rgba(201,150,58,0.1)" },
  ];
  return (
    <div dir="rtl" className="min-h-screen flex items-center py-24 px-6" style={{ background: "transparent" }}>
      <div className="max-w-lg mx-auto w-full">
        <Reveal className="text-center mb-12">
          <SectionLabel>CONTACT US</SectionLabel>
          <h2 className="text-3xl md:text-4xl font-black tracking-wide mb-3 text-white" style={{ fontFamily: "var(--font-cinzel), serif" }}>تواصل معنا الآن</h2>
          <p className="text-sm text-gray-500 leading-relaxed">جاهزون للرد عليك في أي وقت — اختر القناة الأنسب لك وابدأ رحلة النمو الرقمي اليوم</p>
        </Reveal>
        <div className="space-y-3 mb-10">
          {contacts.map((c, i) => (
            <Reveal key={i} delay={i * 45}>
              <a href={c.href} target="_blank" rel="noreferrer" className="flex items-center gap-4 p-5 rounded-2xl border transition duration-300 hover:-translate-x-1 group relative overflow-hidden" style={{ background: "#161616", borderColor: i === 0 ? "rgba(37,211,102,0.4)" : "#2A2A2A" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = i === 0 ? "rgba(37,211,102,0.6)" : "rgba(201,150,58,0.3)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = i === 0 ? "rgba(37,211,102,0.4)" : "#2A2A2A"; }}>
                <div className="absolute right-0 top-0 bottom-0 w-1 scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-center" style={{ background: i === 0 ? "#25D366" : GOLD }} />
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: c.colorBg }}>{c.icon}</div>
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
          <div className="rounded-2xl p-8 text-center border" style={{ background: "linear-gradient(135deg, rgba(201,150,58,0.08), rgba(201,150,58,0.03))", borderColor: "rgba(201,150,58,0.2)" }}>
            <h3 className="text-xl font-black text-white mb-2" style={{ fontFamily: "var(--font-cinzel), serif" }}>مستعد تنمو رقمياً؟</h3>
            <p className="text-sm leading-relaxed mb-6" style={{ color: "#777" }}>تواصل معنا اليوم واحصل على استشارة مجانية لحسابك على السوشيال ميديا</p>
            <a href={WA_LINK} target="_blank" rel="noreferrer" className="inline-block font-black px-8 py-3 rounded-xl text-black text-sm transition duration-300 hover:-translate-y-1" style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD2})`, boxShadow: "0 4px 30px rgba(201,150,58,0.3)" }}>
              ابدأ الآن مجاناً 🚀
            </a>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

function PageHeader({ label, title, desc }) {
  return (
    <Reveal className="text-center mb-14 max-w-2xl mx-auto">
      <SectionLabel>{label}</SectionLabel>
      <h1 className="text-3xl md:text-5xl font-black tracking-wide mt-3 mb-4" style={{ fontFamily: "var(--font-cinzel), serif", color: "var(--text-primary)" }}>{title}</h1>
      <p className="text-sm md:text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>{desc}</p>
    </Reveal>
  );
}

function EmptyState({ text }) {
  return (
    <div className="text-center py-16">
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>{text}</p>
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

function CaseStudiesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    fetchPublished("caseStudies").then((data) => { if (alive) setItems(data); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  return (
    <div dir="rtl" className="min-h-screen px-6 py-28 relative">
      <div className="max-w-5xl mx-auto">
        <PageHeader label="CASE STUDIES" title="دراسات الحالة" desc="نتائج حقيقية لعملاء حقيقيين — نستعرض بعض قصص النجاح اللي حققناها من خلال استراتيجيات تسويقية مدروسة." />
        {loading ? (
          <LoadingState />
        ) : items.length === 0 ? (
          <EmptyState text="لسه مفيش دراسات حالة منشورة — تقدر تضيفها من لوحة السوبر أدمن." />
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {items.map((cs, i) => (
              <Reveal key={cs.id} delay={i * 90}>
                <div className="card-pro rounded-2xl overflow-hidden h-full flex flex-col">
                  {cs.image_url && (
                    <div className="relative aspect-video w-full overflow-hidden">
                      <Image src={cs.image_url} alt={cs.client_name} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
                    </div>
                  )}
                  <div className="p-7 flex flex-col flex-1">
                    <div className="flex items-start justify-between mb-4">
                      {cs.industry && <span className="badge-gold">{cs.industry}</span>}
                      {cs.badge_stat && <span className="text-2xl font-black" style={{ color: "var(--gold-light)", fontFamily: "var(--font-cinzel), serif" }}>{cs.badge_stat}</span>}
                    </div>
                    <h3 className="text-lg font-black mb-1" style={{ color: "var(--text-primary)" }}>{cs.client_name}</h3>
                    {cs.metric_label && <p className="text-xs font-semibold mb-3" style={{ color: "var(--gold)" }}>{cs.metric_label}</p>}
                    <p className="text-sm leading-relaxed flex-1 mb-4" style={{ color: "var(--text-secondary)" }}>{cs.summary}</p>
                    {Array.isArray(cs.tags) && cs.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {cs.tags.map((t, ti) => (
                          <span key={ti} className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: "var(--bg-card-hover)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        )}
        <Reveal delay={200} className="text-center mt-14">
          <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>عايز نتايج زي دي لبراندك؟</p>
          <a href={WA_LINK} target="_blank" rel="noreferrer" className="btn-primary">احجز استشارة مجانية</a>
        </Reveal>
      </div>
    </div>
  );
}

function SocialContentShowcase() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  useEffect(() => {
    let alive = true;
    fetchPublished("socialPosts").then((data) => { if (alive) setItems(data); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const filtered = items.filter((p) => filter === "all" || p.post_type === filter);
  const FILTERS = [
    { id: "all", label: "الكل" },
    { id: "post", label: "بوستات" },
    { id: "video", label: "فيديوهات" },
  ];

  if (!loading && items.length === 0) return null;

  return (
    <div dir="rtl" className="px-6 py-16 relative">
      <div className="max-w-5xl mx-auto">
        <PageHeader label="OUR WORK" title="نماذج منشورات نفّذناها للعملاء" desc="أمثلة من المحتوى اللي بننتجه لعملائنا — بوستات وفيديوهات على منصات السوشيال ميديا المختلفة." />
        <Reveal className="flex items-center justify-center gap-2 mb-10">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className="text-xs font-bold px-4 py-2 rounded-full transition"
              style={{
                border: `1px solid ${filter === f.id ? "var(--gold)" : "var(--border)"}`,
                background: filter === f.id ? "rgba(201,150,58,0.14)" : "transparent",
                color: filter === f.id ? "var(--gold-light)" : "var(--text-muted)",
              }}
            >
              {f.label}
            </button>
          ))}
        </Reveal>
        {loading ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyState text="لسه مفيش منشورات منشورة — تقدر تضيفها من لوحة السوبر أدمن." />
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
            {filtered.map((p, i) => (
              <Reveal key={p.id} delay={i * 60}>
                <div className="card-pro rounded-2xl overflow-hidden">
                  <div className="aspect-square flex items-center justify-center relative overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(201,150,58,0.14), rgba(201,150,58,0.03))" }}>
                    {p.media_url ? (
                      <Image src={p.media_url} alt={p.title} fill sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw" className="object-cover" />
                    ) : (
                      <span className="text-4xl opacity-40">✦</span>
                    )}
                    {p.post_type === "video" && (
                      <span className="absolute inset-0 flex items-center justify-center text-3xl" style={{ background: "rgba(0,0,0,0.25)" }}>▶️</span>
                    )}
                    <span className="absolute top-3 right-3 badge-gold">{p.platform}</span>
                  </div>
                  <div className="p-4">
                    <span className="text-[11px] font-bold tracking-wider" style={{ color: "var(--gold)" }}>{p.post_type === "video" ? "فيديو" : "بوست"}</span>
                    <h3 className="text-sm font-bold mt-1 mb-1" style={{ color: "var(--text-primary)" }}>{p.title}</h3>
                    {p.stat_label && <p className="text-xs" style={{ color: "var(--text-muted)" }}>{p.stat_label}</p>}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        )}
        <Reveal delay={200} className="text-center mt-14">
          <a href="https://www.instagram.com/3bdullah.marketing?igsh=MTEzMXFiZTh2cG81cQ==" target="_blank" rel="noreferrer" className="btn-outline">تابعنا على انستجرام</a>
        </Reveal>
      </div>
    </div>
  );
}

function BlogPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    fetchPublished("blogPosts").then((data) => { if (alive) setItems(data); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  return (
    <div dir="rtl" className="min-h-screen px-6 py-28 relative">
      <div className="max-w-4xl mx-auto">
        <PageHeader label="BLOG" title="المدونة" desc="مقالات ونصائح في عالم التسويق الرقمي والبراندنج، بنشاركها معاك بشكل دوري." />
        {loading ? (
          <LoadingState />
        ) : items.length === 0 ? (
          <EmptyState text="لسه مفيش مقالات منشورة — تقدر تضيفها من لوحة السوبر أدمن." />
        ) : (
          <div className="space-y-5">
            {items.map((b, i) => (
              <Reveal key={b.id} delay={i * 70}>
                <div className="card-pro rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center gap-5">
                  <div className="relative w-full sm:w-28 h-20 rounded-xl flex-shrink-0 flex items-center justify-center text-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(201,150,58,0.16), rgba(201,150,58,0.04))", color: "var(--gold)" }}>
                    {b.cover_image_url ? <Image src={b.cover_image_url} alt={b.title} fill sizes="112px" className="object-cover" /> : "✎"}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      {b.category && <span className="badge-gold">{b.category}</span>}
                      <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{b.read_time_minutes || 4} دقائق قراءة</span>
                    </div>
                    <h3 className="text-base font-black mb-1" style={{ color: "var(--text-primary)" }}>{b.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{b.excerpt}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NotificationBell({ notifications, unreadCount, onItemClick, onMarkAllRead, onViewAll, compact }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const list = (notifications || []).slice(0, 6);
  const hasUnread = list.some((n) => !n.read);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="الإشعارات"
        className={`relative flex items-center justify-center rounded-xl transition-colors ${compact ? "w-9 h-9 text-base" : "w-10 h-10 text-lg"}`}
        style={{ color: GOLD, background: "rgba(201,150,58,0.08)", border: "1px solid rgba(201,150,58,0.18)" }}
      >
        🔔
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[10px] font-black text-white"
            style={{ background: "linear-gradient(135deg,#ff6a6a,#d43b3b)", border: "2px solid var(--bg-elevated)" }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          dir="rtl"
          className="absolute left-0 mt-2 w-80 max-w-[90vw] rounded-2xl overflow-hidden glass-panel"
          style={{ border: "1px solid var(--border-soft)", boxShadow: "0 18px 50px rgba(0,0,0,0.35)", zIndex: 60 }}
        >
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border-soft)" }}>
            <span className="text-sm font-black" style={{ color: "var(--text-primary)" }}>🔔 الإشعارات</span>
            {hasUnread && (
              <button onClick={onMarkAllRead} className="text-[11px] font-bold" style={{ color: GOLD }}>
                تعليم الكل كمقروء
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {list.length === 0 ? (
              <div className="text-center py-6 text-xs" style={{ color: "var(--text-muted)" }}>
                لا توجد إشعارات حتى الآن.
              </div>
            ) : (
              list.map((n) => (
                <button
                  key={n.id}
                  onClick={() => { setOpen(false); onItemClick(n); }}
                  className="flex w-full items-start gap-2.5 px-4 py-3 text-right transition-colors"
                  style={{ borderBottom: "1px solid var(--border-soft)", background: n.read ? "transparent" : "rgba(201,150,58,0.07)" }}
                >
                  <span className="text-base mt-0.5">{NOTIF_ICONS[n.type] || NOTIF_ICONS.default}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs leading-relaxed" style={{ color: "var(--text-primary)", fontWeight: n.read ? 600 : 800 }}>
                      {n.title}
                    </span>
                    <span className="block text-[10.5px] mt-1" style={{ color: "var(--text-muted)" }}>{n.date}</span>
                  </span>
                  {!n.read && <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: GOLD }} />}
                </button>
              ))
            )}
          </div>

          <button
            onClick={() => { setOpen(false); onViewAll(); }}
            className="w-full py-2.5 text-xs font-black"
            style={{ color: GOLD, borderTop: "1px solid var(--border-soft)" }}
          >
            عرض كل الإشعارات
          </button>
        </div>
      )}
    </div>
  );
}

function Navbar({ page, setPage, clientSession, notifications, unreadCount, onNotificationClick, onMarkAllRead }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);
  const DIRECT_PAGES = ["home", "posts", "post-details", "services", "gallery", "portfolio-gallery", "case-studies", "blog", "about", "contact"];
  const links = [
    { id: "home", label: "الرئيسية" },
    { id: "posts", label: "المنشورات" },
    { id: "services", label: "الخدمات" },
    { id: "gallery", label: "الباقات" },
    { id: "portfolio-gallery", label: "معرض الأعمال" },
    { id: "case-studies", label: "دراسات الحالة" },
    { id: "blog", label: "المدونة" },
    { id: "about", label: "من نحن" },
    { id: "contact", label: "تواصل معنا" },
  ];
  const handleNav = (id) => {
    setMenuOpen(false);
    if (DIRECT_PAGES.includes(id)) {
      setPage(id);
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
      <nav dir="rtl" className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-10 py-4 transition duration-300 glass-panel" style={{ boxShadow: scrolled ? "0 4px 40px rgba(0,0,0,0.45)" : "none", borderBottom: scrolled ? "1px solid var(--border-soft)" : "1px solid transparent" }}>
        <button onClick={() => handleNav("home")} className="font-black tracking-widest text-sm transition-opacity hover:opacity-80" style={{ fontFamily: "var(--font-cinzel), serif", background: `linear-gradient(135deg, ${GOLD}, ${GOLD3}, ${GOLD})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>ABDULLAH</button>
        <ul className="hidden md:flex gap-7 list-none">
          {links.map(l => (
            <li key={l.id}>
              <button onClick={() => handleNav(l.id)} className="text-xs font-semibold tracking-wider transition-colors duration-200 relative group pb-1" style={{ color: "var(--text-muted)" }}
                onMouseEnter={e => { e.currentTarget.style.color = GOLD; }}
                onMouseLeave={e => { e.currentTarget.style.color = "var(--text-muted)"; }}>
                {l.label}
                <span className="absolute bottom-0 right-0 h-px transition duration-300 group-hover:w-full rounded-full" style={{ width: 0, background: `linear-gradient(90deg, ${GOLD}, ${GOLD3})` }} />
              </button>
            </li>
          ))}
        </ul>
        <div className="hidden md:flex items-center gap-3">
          {clientSession && (
            <NotificationBell
              notifications={notifications}
              unreadCount={unreadCount}
              onItemClick={onNotificationClick}
              onMarkAllRead={onMarkAllRead}
              onViewAll={() => { setMenuOpen(false); setPage("dashboard"); }}
            />
          )}
          <button
            onClick={() => { setMenuOpen(false); setPage(clientSession ? "dashboard" : "login"); }}
            className="text-xs font-semibold tracking-wider px-4 py-2 rounded-full transition-colors"
            style={{ color: GOLD, border: "1px solid rgba(201,150,58,0.35)", background: "transparent" }}
          >
            {clientSession ? "حسابي" : "تسجيل الدخول"}
          </button>
          <a href={WA_LINK} target="_blank" rel="noreferrer" className="btn-primary !py-2 !px-5 text-xs">واتساب</a>
        </div>
        <div className="flex md:hidden items-center gap-2">
          {clientSession && (
            <NotificationBell
              compact
              notifications={notifications}
              unreadCount={unreadCount}
              onItemClick={onNotificationClick}
              onMarkAllRead={onMarkAllRead}
              onViewAll={() => { setMenuOpen(false); setPage("dashboard"); }}
            />
          )}
          <button
            onClick={() => { setMenuOpen(false); setPage(clientSession ? "dashboard" : "login"); }}
            aria-label={clientSession ? "حسابي" : "تسجيل الدخول"}
            className="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
            style={{ color: GOLD, background: "rgba(201,150,58,0.08)", border: "none" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
              <path d="M4 20c0-3.5 3.5-6 8-6s8 2.5 8 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <button className="text-xl leading-none w-9 h-9 flex items-center justify-center rounded-full transition-colors" style={{ color: GOLD, background: "rgba(201,150,58,0.08)", border: "none" }} onClick={() => setMenuOpen(m => !m)}>{menuOpen ? "✕" : "☰"}</button>
        </div>
      </nav>
      {menuOpen && (
        <div dir="rtl" className="fixed top-16 left-0 right-0 z-40 py-3 border-b glass-panel" style={{ animation: "fadeDown 0.25s ease" }}>
          {links.map(l => (
            <button key={l.id} onClick={() => handleNav(l.id)} className="block w-full text-right px-6 py-3 text-sm font-semibold transition-colors" style={{ color: "var(--text-secondary)" }}
              onMouseEnter={e => { e.currentTarget.style.color = GOLD; }}
              onMouseLeave={e => { e.currentTarget.style.color = "var(--text-secondary)"; }}>{l.label}</button>
          ))}
        </div>
      )}
    </>
  );
}

function Footer({ setPage }) {
  return (
    <footer dir="rtl" className="px-6 md:px-10 pt-10 pb-8" style={{ background: "var(--bg-elevated)", borderTop: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between flex-wrap gap-6">
        <div>
          <span className="font-black tracking-widest text-sm block" style={{ fontFamily: "var(--font-cinzel), serif", color: GOLD }}>ABDULLAH MARKETING</span>
          <span className="text-xs mt-1 block" style={{ color: "var(--text-muted)" }}>منصة تسويق رقمي احترافية · أسيوط، مصر</span>
        </div>
        <div className="flex gap-2.5">
          {[
            { href: WA_LINK, icon: "📲", title: "WhatsApp" },
            { href: "https://www.instagram.com/3bdullah.marketing?igsh=MTEzMXFiZTh2cG81cQ==", icon: "📷", title: "Instagram Business" },
            { href: "https://www.facebook.com/share/1DwbCov7zr/", icon: "📘", title: "Facebook" },
            { href: "https://www.instagram.com/3bdullah.dyaa?igsh=MTFnMDM4NHUxemc3cQ==", icon: "📸", title: "Instagram Personal" },
          ].map((s, i) => (
            <a key={i} href={s.href} target="_blank" rel="noreferrer" title={s.title} className="w-10 h-10 rounded-xl flex items-center justify-center text-base transition duration-200 hover:-translate-y-1" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = GOLD; e.currentTarget.style.boxShadow = "0 8px 20px rgba(201,150,58,0.2)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}>{s.icon}</a>
          ))}
        </div>
      </div>
      <div className="divider-gradient my-6" />
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mb-6 text-xs" style={{ color: "var(--text-muted)" }}>
        {[
          { icon: "🔒", label: "بيانات وعقود آمنة" },
          { icon: "⚡", label: "رد خلال 24 ساعة" },
          { icon: "🤝", label: "مدير حساب مخصص لكل عميل" },
          { icon: "📊", label: "تقارير أداء دورية موثقة" },
        ].map((b, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 font-semibold">
            <span>{b.icon}</span>
            <span>{b.label}</span>
          </span>
        ))}
      </div>
      <div className="divider-gradient mb-6" />
      <div className="flex items-center justify-between flex-wrap gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
        <span>© {new Date().getFullYear()} Abdullah Marketing. جميع الحقوق محفوظة.</span>
        <span>صُنع بشغف لعلامتك التجارية ✦</span>
      </div>
    </footer>
  );
}

export default function App() {
  const [page, setPage] = useState("home");
  const [selectedPackageId, setSelectedPackageId] = useState(null);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [builderInitialData, setBuilderInitialData] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [clientSession, setClientSession] = useState(null);
  const [clientAuthChecked, setClientAuthChecked] = useState(false);
  const [notifications, setNotifications] = useState(null);

  // نظام الباقات المخصصة يستخدم روابط hash (#gallery, #admin, #package-details?id=..)
  // عشان صفحة /admin تكون قابلة للوصول برابط مباشر وغير موجودة في القائمة العادية،
  // من غير ما نضيف مكتبة routing جديدة للمشروع.
  useEffect(() => {
    function syncFromHash() {
      const hash = window.location.hash.replace("#", "");
      if (!hash) return;
      const [route, queryString] = hash.split("?");
      const params = new URLSearchParams(queryString || "");
      if (route === "gallery") setPage("gallery");
      else if (route === "package-details") {
        setSelectedPackageId(params.get("id"));
        setPage("package-details");
      } else if (route === "admin") setPage("admin");
      else if (route === "portfolio-gallery") setPage("portfolio-gallery");
      else if (route === "login") setPage("login");
      else if (route === "signup") setPage("signup");
      else if (route === "forgot-password") setPage("forgot-password");
      else if (route === "reset-password") setPage("reset-password");
      else if (route === "dashboard") setPage("dashboard");
      else if (route === "services") setPage("services");
      else if (route === "case-studies") setPage("case-studies");
      else if (route === "posts") setPage("posts");
      else if (route === "post-details") {
        setSelectedPostId(params.get("id"));
        setPage("post-details");
      }
      else if (route === "blog") setPage("blog");
      else if (route === "about") setPage("about");
      else if (route === "contact") setPage("contact");
    }
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  useEffect(() => {
    if (["gallery", "package-details", "admin", "admin-login", "portfolio-gallery", "login", "signup", "forgot-password", "reset-password", "dashboard", "services", "case-studies", "posts", "post-details", "blog", "about", "contact"].includes(page)) {
      const hash =
        page === "package-details" && selectedPackageId
          ? `#package-details?id=${selectedPackageId}`
          : page === "post-details" && selectedPostId
          ? `#post-details?id=${selectedPostId}`
          : `#${page === "admin-login" ? "admin" : page}`;
      if (window.location.hash !== hash) window.history.replaceState(null, "", hash);
    } else if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [page, selectedPackageId, selectedPostId]);

  // لو داخل على #admin ومعاه Session أدمن شغالة بالفعل، يدخل على طول من غير Login
  useEffect(() => {
    if (page !== "admin") return;
    getCurrentSession().then(async (session) => {
      if (session) setIsAdmin(await isCurrentUserAdmin());
    });
  }, [page]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  // نظام حسابات العملاء: يتحقق من وجود جلسة دخول شغالة أول ما الموقع يفتح،
  // ويفضل يسمع لأي تغيير (دخول/خروج/تحديث توكن) عشان يحدّث الواجهة (Navbar وغيره)
  useEffect(() => {
    getCurrentClientSession().then((session) => {
      setClientSession(session);
      setClientAuthChecked(true);
    });
    const unsubscribe = onClientAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") return; // بتتعالج جوه صفحة reset-password نفسها
      setClientSession(session);
    });
    return unsubscribe;
  }, []);

  // إشعارات العميل — بتحمّل أول ما يسجّل دخول، وتتحدّث فورًا (Realtime) لحظة
  // ما الأدمن ينشر منشور/إشعار جديد. الجرس في الـ Navbar وتبويب "الإشعارات"
  // في لوحة العميل بيقروا من نفس الـ state ده عشان يفضلوا متزامنين مع بعض.
  const clientUserId = clientSession?.user?.id || null;
  useEffect(() => {
    if (!clientUserId) {
      setNotifications(null);
      return;
    }
    let active = true;
    getNotifications()
      .then((rows) => { if (active) setNotifications(rows); })
      .catch(() => { if (active) setNotifications([]); });
    const unsubscribe = subscribeToClientNotifications(clientUserId, (n) => {
      setNotifications((list) => [n, ...(list || [])]);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [clientUserId]);

  const unreadNotifCount = useMemo(() => (notifications || []).filter((n) => !n.read).length, [notifications]);

  function handleNotificationClick(n) {
    if (!n.read) {
      setNotifications((list) => (list || []).map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      markNotificationRead(n.id).catch(() => {});
    }
    if (n.linkType === "sitePost" && n.linkId) {
      window.location.hash = `#post-details?id=${n.linkId}`;
    }
  }

  function handleMarkAllNotificationsRead() {
    setNotifications((list) => (list || []).map((n) => ({ ...n, read: true })));
    markAllNotificationsRead().catch(() => {});
  }

  useEffect(() => {
    const setMeta = (attr, key, content) => {
      let tag = document.querySelector(`meta[${attr}="${key}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(attr, key);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    };

    document.title = "Abdullah Marketing";
    setMeta("property", "og:title", "Abdullah Marketing");
    setMeta("property", "og:description", "خدمات تسويق ومحتوى احترافية للمطاعم والبراندات — سوشيال ميديا، تصميم، مواقع، إعلانات.");
    setMeta("property", "og:image", IMG_OG);
    setMeta("property", "og:type", "website");
    setMeta("property", "og:url", window.location.href);
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", "Abdullah Marketing");
    setMeta("name", "twitter:description", "خدمات تسويق ومحتوى احترافية للمطاعم والبراندات.");
    setMeta("name", "twitter:image", IMG_OG);

    const setFavicon = (href) => {
      const existing = document.querySelectorAll("link[rel*='icon']");
      existing.forEach((el) => el.parentNode.removeChild(el));
      const link = document.createElement("link");
      link.rel = "icon";
      link.type = "image/png";
      link.href = href;
      document.head.appendChild(link);
    };
    setFavicon(IMG_LOGO);
  }, []);

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Cairo, sans-serif; overflow-x: hidden; }
        @keyframes floatUp { 0% { opacity:0; transform:translateY(100vh); } 10% { opacity:0.6; } 90% { opacity:0.2; } 100% { opacity:0; transform:translateY(-20px); } }
        @keyframes fadeDown { from { opacity:0; transform:translateY(-16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes scaleIn { from { opacity:0; transform:scale(0.8); } to { opacity:1; transform:scale(1); } }
        @keyframes spin-slow { to { transform:rotate(360deg); } }
        @keyframes waPulse { 0%,100% { box-shadow:0 4px 24px rgba(37,211,102,0.45); } 50% { box-shadow:0 4px 40px rgba(37,211,102,0.8),0 0 0 10px rgba(37,211,102,0.1); } }
        @keyframes logoPulse { 0%,100% { opacity:0.5; transform:scale(1); } 50% { opacity:1; transform:scale(1.08); } }
        @keyframes logoGlow { 0%,100% { filter:drop-shadow(0 0 14px rgba(201,150,58,0.4)) drop-shadow(0 0 30px rgba(201,150,58,0.15)); } 50% { filter:drop-shadow(0 0 28px rgba(245,215,142,0.75)) drop-shadow(0 0 55px rgba(201,150,58,0.35)); } }
        .animate-spin-slow { animation: spin-slow 20s linear infinite; }
      `}</style>
      <WAButton />
      {!["admin", "login", "signup", "forgot-password", "reset-password", "dashboard"].includes(page) && (
        <MarketingChatWidget />
      )}
      {!["admin", "login", "signup", "forgot-password", "reset-password"].includes(page) && <AnnouncementBar />}
      <Navbar
        page={page}
        setPage={setPage}
        clientSession={clientSession}
        notifications={notifications}
        unreadCount={unreadNotifCount}
        onNotificationClick={handleNotificationClick}
        onMarkAllRead={handleMarkAllNotificationsRead}
      />
      {page === "home" && (
        <>
          <HeroPage setPage={setPage} />
          <PostsFeedSection
            onOpenPost={(id) => { setSelectedPostId(id); setPage("post-details"); }}
            onViewAll={() => setPage("posts")}
          />
          <ServicesSection setPage={setPage} />
          <FeaturedProjectSection />
          <PortfolioSection />
          <TipsSection />
          <PricingSection setPage={setPage} />
          <WhySection />
          <TestimonialsSection />
          <ProcessSection />
        </>
      )}
      {page === "services" && (
        <div className="pt-20">
          <ServicesSection setPage={setPage} />
        </div>
      )}
      {page === "case-studies" && <CaseStudiesPage />}
      {page === "posts" && (
        <PostsGridPage onOpenPost={(id) => { setSelectedPostId(id); setPage("post-details"); }} />
      )}
      {page === "post-details" && (
        <PostDetailPage
          postId={selectedPostId}
          onBack={() => setPage("posts")}
          onOpenPost={(id) => setSelectedPostId(id)}
        />
      )}
      {page === "blog" && <BlogPage />}
      {page === "about" && <AboutPage setPage={setPage} />}
      {page === "contact" && <ContactPage />}
      {page === "builder" && <BuilderPage setPage={setPage} initialData={builderInitialData} />}

      {page === "gallery" && (
        <PackagesGallery
          onOpenPackage={(id) => { setSelectedPackageId(id); setPage("package-details"); }}
          onCreateNew={() => { setBuilderInitialData(null); setPage("builder"); }}
          onBack={() => setPage("home")}
        />
      )}

      {page === "package-details" && (
        <PackageDetails
          packageId={selectedPackageId}
          onUseAsNew={(pkgData) => { setBuilderInitialData(pkgData); setPage("builder"); }}
          onBack={() => setPage("gallery")}
        />
      )}

      {page === "portfolio-gallery" && (
        <>
          <PortfolioGallery />
          <SocialContentShowcase />
        </>
      )}

      {page === "login" && (
        <ClientLogin
          setPage={setPage}
          onSuccess={(session) => { setClientSession(session); setPage("dashboard"); }}
        />
      )}
      {page === "signup" && (
        <ClientSignup
          setPage={setPage}
          onSuccess={(session) => { setClientSession(session); setPage("dashboard"); }}
        />
      )}
      {page === "forgot-password" && <ClientForgotPassword setPage={setPage} />}
      {page === "reset-password" && <ClientResetPassword setPage={setPage} />}
      {page === "dashboard" && clientAuthChecked && !clientSession && (
        <ClientLogin
          setPage={setPage}
          onSuccess={(session) => { setClientSession(session); setPage("dashboard"); }}
        />
      )}
      {page === "dashboard" && clientSession && (
        <ClientDashboard
          onLogout={async () => { await signOutClient(); setClientSession(null); setPage("home"); }}
          notifications={notifications}
          onNotificationClick={handleNotificationClick}
          onMarkAllRead={handleMarkAllNotificationsRead}
        />
      )}

      {page === "admin" && !isAdmin && (
        <AdminLogin onSuccess={() => setIsAdmin(true)} />
      )}
      {page === "admin" && isAdmin && (
        <AdminDashboard
          onLogout={async () => { await signOutAdmin(); setIsAdmin(false); setPage("home"); }}
          onOpenPackage={(id) => { setSelectedPackageId(id); setPage("package-details"); }}
        />
      )}

      <Footer setPage={setPage} />
    </>
  );
}
