// src/components/ClientForgotPassword.jsx
import { useState } from "react";
import { GOLD, GOLD2, BG, FONT } from "../config/theme";
import { requestPasswordReset } from "../services/clientAuthService";

export default function ClientForgotPassword({ setPage }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError("حصل خطأ، تأكد من البريد الإلكتروني وحاول تاني.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div dir="rtl" style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 380, background: "linear-gradient(160deg,#120c02,#080602)", border: "1px solid rgba(201,150,58,0.3)", borderRadius: 20, padding: "30px 26px" }}>
        {sent ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>📩</div>
            <h1 style={{ fontFamily: FONT, fontSize: 20, fontWeight: 900, color: "#fff", marginBottom: 10 }}>تم إرسال الرابط</h1>
            <p style={{ color: "#aaa", fontSize: 13, lineHeight: 1.8 }}>
              لو الإيميل ده متسجل عندنا، هيوصلك رابط لإعادة تعيين كلمة المرور خلال دقايق.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h1 style={{ fontFamily: FONT, fontSize: 22, fontWeight: 900, color: "#fff", marginBottom: 6, textAlign: "center" }}>
              نسيت كلمة المرور؟
            </h1>
            <p style={{ color: "#888", fontSize: 13, marginBottom: 24, textAlign: "center" }}>
              اكتب بريدك الإلكتروني وهنبعتلك رابط لإعادة التعيين
            </p>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="البريد الإلكتروني"
              style={inputStyle}
            />
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
              {loading ? "جاري الإرسال..." : "إرسال رابط إعادة التعيين"}
            </button>
          </form>
        )}
        <p style={{ color: "#888", fontSize: 12, marginTop: 18, textAlign: "center" }}>
          <button
            type="button"
            onClick={() => setPage("login")}
            style={{ background: "none", border: "none", color: GOLD, fontSize: 12, cursor: "pointer", fontWeight: 700, padding: 0 }}
          >
            رجوع لتسجيل الدخول
          </button>
        </p>
      </div>
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
