// src/components/ClientSignup.jsx
import { useState } from "react";
import { GOLD, GOLD2, BG, FONT } from "../config/theme";
import { signUpClient } from "../services/clientAuthService";

export default function ClientSignup({ onSuccess, setPage }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("كلمة المرور لازم تكون 6 حروف/أرقام على الأقل.");
      return;
    }
    if (password !== confirmPassword) {
      setError("كلمة المرور وتأكيدها مش متطابقين.");
      return;
    }

    setLoading(true);
    try {
      const data = await signUpClient({ email, password, fullName, phone, businessName });
      if (data.session) {
        // بعض مشاريع Supabase بتكون معطلة فيها خطوة تأكيد الإيميل → يدخل على طول
        onSuccess(data.session);
      } else {
        // في انتظار تأكيد الإيميل
        setConfirmSent(true);
      }
    } catch (err) {
      setError(
        err?.message?.includes("already registered") || err?.message?.includes("User already registered")
          ? "الإيميل ده متسجل بالفعل، جرّب تسجيل الدخول."
          : "حصل خطأ أثناء إنشاء الحساب، حاول تاني."
      );
    } finally {
      setLoading(false);
    }
  }

  if (confirmSent) {
    return (
      <div dir="rtl" style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ width: "100%", maxWidth: 380, textAlign: "center", background: "linear-gradient(160deg,#120c02,#080602)", border: "1px solid rgba(201,150,58,0.3)", borderRadius: 20, padding: "36px 26px" }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>📩</div>
          <h1 style={{ fontFamily: FONT, fontSize: 20, fontWeight: 900, color: "#fff", marginBottom: 10 }}>تحقق من بريدك الإلكتروني</h1>
          <p style={{ color: "#aaa", fontSize: 13, lineHeight: 1.8 }}>
            بعتنالك رابط تفعيل على <span style={{ color: GOLD }}>{email}</span>. دوس عليه عشان تقدر تسجّل دخول.
          </p>
          <button
            onClick={() => setPage("login")}
            style={{ width: "100%", marginTop: 22, padding: "13px 0", borderRadius: 12, border: "none", fontWeight: 900, fontSize: 14, cursor: "pointer", color: "#000", background: `linear-gradient(135deg,${GOLD},${GOLD2})` }}
          >
            تسجيل الدخول
          </button>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%", maxWidth: 400,
          background: "linear-gradient(160deg,#120c02,#080602)",
          border: "1px solid rgba(201,150,58,0.3)",
          borderRadius: 20, padding: "30px 26px",
        }}
      >
        <h1 style={{ fontFamily: FONT, fontSize: 22, fontWeight: 900, color: "#fff", marginBottom: 6, textAlign: "center" }}>
          إنشاء حساب جديد
        </h1>
        <p style={{ color: "#888", fontSize: 13, marginBottom: 22, textAlign: "center" }}>
          عشان تقدر تتابع مشاريعك وباقاتك من مكان واحد
        </p>

        <input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="الاسم الكامل" style={inputStyle} />
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="البريد الإلكتروني" style={{ ...inputStyle, marginTop: 12 }} />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="رقم الهاتف (اختياري)" style={{ ...inputStyle, marginTop: 12 }} />
        <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="اسم النشاط التجاري (اختياري)" style={{ ...inputStyle, marginTop: 12 }} />
        <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="كلمة المرور" style={{ ...inputStyle, marginTop: 12 }} />
        <input required type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="تأكيد كلمة المرور" style={{ ...inputStyle, marginTop: 12 }} />

        {error && <p style={{ color: "#ff8080", fontSize: 12, marginTop: 12 }}>{error}</p>}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%", marginTop: 20, padding: "13px 0", borderRadius: 12, border: "none",
            fontWeight: 900, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", color: "#000",
            background: `linear-gradient(135deg,${GOLD},${GOLD2})`, opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "جاري الإنشاء..." : "إنشاء الحساب"}
        </button>

        <p style={{ color: "#888", fontSize: 12, marginTop: 18, textAlign: "center" }}>
          عندك حساب بالفعل؟{" "}
          <button
            type="button"
            onClick={() => setPage("login")}
            style={{ background: "none", border: "none", color: GOLD, fontSize: 12, cursor: "pointer", fontWeight: 700, padding: 0 }}
          >
            تسجيل الدخول
          </button>
        </p>
      </form>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(201,150,58,0.2)",
  borderRadius: 10,
  padding: "12px 14px",
  color: "#fff",
  fontSize: 14,
  outline: "none",
};
