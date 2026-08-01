// src/components/SubscribeModal.jsx
//
// مودال "اشترك الآن" — بيظهر من PackageDetails.jsx عند اختيار أي باقة.
// المنطق:
//  1) لو مش مسجل دخول → فورم دخول/تسجيل مصغّر جوه المودال نفسه (من غير ما يخرج من الصفحة).
//  2) لو مسجل دخول → ملخص الباقة + خانة كوبون خصم + تأكيد الاشتراك.
//  3) بعد التأكيد: بيتعمل طلب اشتراك بحالة "قيد المراجعة" (Pending) ويتفتح واتساب تلقائيًا.
//     الاشتراك ميتفعّلش إلا بعد موافقة الأدمن من لوحة السوبر أدمن.

import { useEffect, useState } from "react";
import { GOLD, GOLD2, GOLD3, FONT } from "../config/theme";
import { getCurrentClientSession, signInClient, signUpClient } from "../services/clientAuthService";
import { checkCoupon, calcFinalPrice, createSubscriptionRequest } from "../services/subscriptionService";

const inputStyle = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(201,150,58,0.25)",
  borderRadius: 10,
  padding: "11px 14px",
  color: "#fff",
  fontSize: 13.5,
  fontFamily: FONT,
  outline: "none",
  boxSizing: "border-box",
};

function PrimaryButton({ children, onClick, disabled, style }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
        fontWeight: 900, fontSize: 14, cursor: disabled ? "not-allowed" : "pointer",
        color: "#000", background: `linear-gradient(135deg,${GOLD},${GOLD2})`,
        opacity: disabled ? 0.6 : 1, ...style,
      }}
    >
      {children}
    </button>
  );
}

export default function SubscribeModal({ pkg, initialCoupon = "", onClose, onSubscribed }) {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [session, setSession] = useState(null);
  const [authMode, setAuthMode] = useState("signup"); // "signup" | "login"

  // فورم الدخول/التسجيل المصغّر
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  // خطوة الاشتراك
  const [couponCode, setCouponCode] = useState(initialCoupon || "");
  const [coupon, setCoupon] = useState(null);
  const [couponMsg, setCouponMsg] = useState("");
  const [couponChecking, setCouponChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // { subscription, whatsappLink } بعد نجاح الاشتراك

  useEffect(() => {
    getCurrentClientSession().then((s) => {
      setSession(s);
      setCheckingAuth(false);
    });
  }, []);

  // تحقق من الكوبون مع debounce بسيط
  useEffect(() => {
    if (!couponCode.trim()) {
      setCoupon(null);
      setCouponMsg("");
      return;
    }
    setCouponChecking(true);
    const t = setTimeout(async () => {
      const c = await checkCoupon(couponCode.trim());
      setCoupon(c);
      setCouponMsg(c ? `✅ كود خصم صالح (${c.discount_type === "percent" ? `${c.discount_value}%` : `${c.discount_value} ج.م`})` : "❌ كود الخصم غير صالح أو منتهي");
      setCouponChecking(false);
    }, 450);
    return () => clearTimeout(t);
  }, [couponCode]);

  async function handleAuthSubmit(e) {
    e.preventDefault();
    setAuthError("");
    if (!email.trim() || password.length < 6) {
      setAuthError("من فضلك اكتب إيميل صحيح وكلمة مرور 6 حروف على الأقل.");
      return;
    }
    setAuthLoading(true);
    try {
      if (authMode === "signup") {
        const data = await signUpClient({ email: email.trim(), password, fullName, phone });
        if (data.session) {
          setSession(data.session);
        } else {
          setConfirmSent(true);
        }
      } else {
        const s = await signInClient(email.trim(), password);
        setSession(s);
      }
    } catch (err) {
      const msg = err?.message || "";
      if (msg.includes("already registered") || msg.includes("User already registered")) {
        setAuthError("الإيميل ده متسجل بالفعل، جرّب تسجيل الدخول.");
      } else if (msg.includes("Invalid login")) {
        setAuthError("بيانات الدخول غير صحيحة.");
      } else {
        setAuthError("حصل خطأ، حاول تاني.");
      }
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleConfirmSubscribe() {
    setSubmitting(true);
    setError("");
    try {
      const res = await createSubscriptionRequest({ pkg, couponCode: coupon ? couponCode.trim() : "" });
      setResult(res);
      window.open(res.whatsappLink, "_blank");
    } catch (err) {
      setError(err.message || "تعذّر إتمام الاشتراك، حاول تاني.");
    } finally {
      setSubmitting(false);
    }
  }

  const basePrice = Number(pkg?.final_price || 0);
  const { discount, finalPrice } = calcFinalPrice(basePrice, coupon);

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 440, maxHeight: "90vh", overflowY: "auto",
          background: "linear-gradient(160deg,#120c02,#080602)",
          border: "1px solid rgba(201,150,58,0.35)", borderRadius: 20, padding: "26px 22px",
        }}
      >
        {checkingAuth ? (
          <p style={{ color: "#888", fontSize: 13, textAlign: "center" }}>جاري التحقق من حسابك...</p>
        ) : result ? (
          // ==================== نجاح الاشتراك ====================
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 42, marginBottom: 12 }}>✅</div>
            <h3 style={{ fontFamily: FONT, color: "#fff", fontWeight: 900, fontSize: 18, marginBottom: 8 }}>
              تم إرسال طلب الاشتراك
            </h3>
            <p style={{ color: "#aaa", fontSize: 13, lineHeight: 1.8, marginBottom: 16 }}>
              حالة الاشتراك دلوقتي <b style={{ color: GOLD3 }}>قيد المراجعة</b>. هيتفعّل بعد موافقة الأدمن.
              فتحنالك واتساب تلقائيًا — لو محصلش، ابعتلنا من هنا:
            </p>
            <a
              href={result.whatsappLink}
              target="_blank"
              rel="noreferrer"
              style={{ display: "block", padding: "12px 0", borderRadius: 12, marginBottom: 10, textDecoration: "none", fontWeight: 800, fontSize: 13.5, color: "#25D366", border: "1px solid rgba(37,211,102,0.4)" }}
            >
              📲 فتح واتساب
            </a>
            <PrimaryButton onClick={() => { onSubscribed?.(); onClose(); }}>الذهاب للوحة التحكم</PrimaryButton>
          </div>
        ) : !session ? (
          // ==================== خطوة الدخول/التسجيل ====================
          confirmSent ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📩</div>
              <h3 style={{ fontFamily: FONT, color: "#fff", fontWeight: 900, fontSize: 17, marginBottom: 8 }}>تحقق من بريدك الإلكتروني</h3>
              <p style={{ color: "#aaa", fontSize: 13, lineHeight: 1.8, marginBottom: 16 }}>
                بعتنالك رابط تفعيل على <span style={{ color: GOLD }}>{email}</span>. بعد التفعيل سجّل دخولك وارجع اشترك في الباقة.
              </p>
              <PrimaryButton onClick={onClose}>إغلاق</PrimaryButton>
            </div>
          ) : (
            <form onSubmit={handleAuthSubmit}>
              <h3 style={{ fontFamily: FONT, color: "#fff", fontWeight: 900, fontSize: 17, marginBottom: 4, textAlign: "center" }}>
                {authMode === "signup" ? "أنشئ حسابك للاشتراك" : "سجّل دخولك للاشتراك"}
              </h3>
              <p style={{ color: "#888", fontSize: 12.5, marginBottom: 18, textAlign: "center" }}>
                باقة «{pkg?.package_name}» — لازم يكون عندك حساب عشان تتابع حالة الاشتراك
              </p>

              {authMode === "signup" && (
                <>
                  <input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="الاسم الكامل" style={{ ...inputStyle, marginBottom: 10 }} />
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="رقم الهاتف (اختياري)" style={{ ...inputStyle, marginBottom: 10 }} />
                </>
              )}
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="البريد الإلكتروني" style={{ ...inputStyle, marginBottom: 10 }} />
              <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="كلمة المرور" style={{ ...inputStyle, marginBottom: 10 }} />

              {authError && <p style={{ color: "#ff8080", fontSize: 12, marginBottom: 10 }}>{authError}</p>}

              <PrimaryButton disabled={authLoading} style={{ marginTop: 6 }}>
                {authLoading ? "جاري التنفيذ..." : authMode === "signup" ? "إنشاء الحساب والمتابعة" : "تسجيل الدخول والمتابعة"}
              </PrimaryButton>

              <p style={{ color: "#888", fontSize: 12, marginTop: 14, textAlign: "center" }}>
                {authMode === "signup" ? "عندك حساب بالفعل؟" : "لسه معندكش حساب؟"}{" "}
                <button
                  type="button"
                  onClick={() => { setAuthMode((m) => (m === "signup" ? "login" : "signup")); setAuthError(""); }}
                  style={{ background: "none", border: "none", color: GOLD, fontSize: 12, cursor: "pointer", fontWeight: 700, padding: 0 }}
                >
                  {authMode === "signup" ? "سجّل دخولك" : "أنشئ حساب"}
                </button>
              </p>
              <button type="button" onClick={onClose} style={{ display: "block", margin: "10px auto 0", background: "none", border: "none", color: "#777", fontSize: 12, cursor: "pointer" }}>
                إلغاء
              </button>
            </form>
          )
        ) : (
          // ==================== خطوة تأكيد الاشتراك ====================
          <div>
            <h3 style={{ fontFamily: FONT, color: "#fff", fontWeight: 900, fontSize: 17, marginBottom: 4 }}>
              🚀 تأكيد الاشتراك
            </h3>
            <p style={{ color: "#888", fontSize: 12.5, marginBottom: 18 }}>باقة «{pkg?.package_name}»</p>

            <label style={{ display: "block", fontSize: 12.5, color: "#aaa", marginBottom: 6, fontWeight: 700 }}>🏷️ كود خصم (اختياري)</label>
            <input
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="اكتب كود الخصم لو عندك"
              style={{ ...inputStyle, marginBottom: 6 }}
            />
            {couponChecking && <p style={{ color: "#888", fontSize: 11.5, marginBottom: 10 }}>جاري التحقق...</p>}
            {!couponChecking && couponMsg && (
              <p style={{ color: coupon ? "#4ade80" : "#ff8080", fontSize: 11.5, marginBottom: 10 }}>{couponMsg}</p>
            )}

            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(201,150,58,0.2)", borderRadius: 12, padding: "14px 16px", margin: "12px 0 18px" }}>
              <Row label="السعر الأساسي" value={`${basePrice.toLocaleString()} ج.م`} />
              {discount > 0 && <Row label="الخصم" value={`- ${discount.toLocaleString()} ج.م`} valueColor="#4ade80" />}
              <div style={{ borderTop: "1px solid rgba(201,150,58,0.2)", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ color: "#999", fontSize: 13, fontWeight: 700 }}>الإجمالي</span>
                <span style={{ fontFamily: "var(--font-cinzel), serif", fontSize: 20, fontWeight: 900, color: GOLD3 }}>{finalPrice.toLocaleString()} ج.م</span>
              </div>
            </div>

            {error && <p style={{ color: "#ff8080", fontSize: 12, marginBottom: 12 }}>{error}</p>}

            <PrimaryButton onClick={handleConfirmSubscribe} disabled={submitting}>
              {submitting ? "جاري الإرسال..." : "✅ تأكيد الاشتراك"}
            </PrimaryButton>
            <button type="button" onClick={onClose} style={{ display: "block", margin: "12px auto 0", background: "none", border: "none", color: "#777", fontSize: 12, cursor: "pointer" }}>
              إلغاء
            </button>
            <p style={{ color: "#777", fontSize: 11, marginTop: 12, textAlign: "center", lineHeight: 1.7 }}>
              بعد التأكيد هيتفتح واتساب تلقائيًا وحالة الاشتراك هتكون "قيد المراجعة" لحد ما يوافق عليها الأدمن.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, valueColor }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
      <span style={{ color: "#999", fontSize: 12.5 }}>{label}</span>
      <span style={{ color: valueColor || "#eee", fontSize: 12.5, fontWeight: 700 }}>{value}</span>
    </div>
  );
}
