// src/components/ClientResetPassword.jsx
// الصفحة اللي بتفتح لما اليوزر يدوس على رابط "إعادة تعيين كلمة المرور" الجاي بالإيميل.
// Supabase بيحط access_token في الـ URL ويعمل session مؤقتة نوعها "recovery" تلقائيًا.
import { useState, useEffect } from "react";
import { GOLD, GOLD2, BG, FONT } from "../config/theme";
import { updateClientPassword, onClientAuthStateChange, getCurrentClientSession } from "../services/clientAuthService";

export default function ClientResetPassword({ setPage }) {
  const [status, setStatus] = useState("checking"); // checking | ready | invalid | done
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let settled = false;

    const unsubscribe = onClientAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        settled = true;
        setStatus("ready");
      }
    });

    // fallback: لو الحدث فاتنا، اتأكد لو أصلاً فيه session شغالة
    getCurrentClientSession().then((session) => {
      if (!settled && session) setStatus("ready");
      else if (!settled) setTimeout(() => setStatus((s) => (s === "checking" ? "invalid" : s)), 2500);
    });

    return unsubscribe;
  }, []);

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
      await updateClientPassword(password);
      setStatus("done");
    } catch (err) {
      setError("حصل خطأ أثناء تحديث كلمة المرور، حاول تاني.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div dir="rtl" style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 380, background: "linear-gradient(160deg,#120c02,#080602)", border: "1px solid rgba(201,150,58,0.3)", borderRadius: 20, padding: "30px 26px" }}>

        {status === "checking" && (
          <p style={{ color: "#888", fontSize: 14, textAlign: "center", padding: "20px 0" }}>جاري التحقق من الرابط...</p>
        )}

        {status === "invalid" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>⚠️</div>
            <h1 style={{ fontFamily: FONT, fontSize: 20, fontWeight: 900, color: "#fff", marginBottom: 10 }}>الرابط غير صالح</h1>
            <p style={{ color: "#aaa", fontSize: 13, lineHeight: 1.8, marginBottom: 20 }}>
              الرابط منتهي الصلاحية أو تم استخدامه من قبل. اطلب رابط جديد.
            </p>
            <button
              onClick={() => setPage("forgot-password")}
              style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: "none", fontWeight: 900, fontSize: 14, cursor: "pointer", color: "#000", background: `linear-gradient(135deg,${GOLD},${GOLD2})` }}
            >
              طلب رابط جديد
            </button>
          </div>
        )}

        {status === "ready" && (
          <form onSubmit={handleSubmit}>
            <h1 style={{ fontFamily: FONT, fontSize: 22, fontWeight: 900, color: "#fff", marginBottom: 6, textAlign: "center" }}>
              كلمة مرور جديدة
            </h1>
            <p style={{ color: "#888", fontSize: 13, marginBottom: 22, textAlign: "center" }}>اختار كلمة مرور جديدة لحسابك</p>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="كلمة المرور الجديدة" style={inputStyle} />
            <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="تأكيد كلمة المرور" style={{ ...inputStyle, marginTop: 12 }} />
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
              {loading ? "جاري الحفظ..." : "حفظ كلمة المرور"}
            </button>
          </form>
        )}

        {status === "done" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>✅</div>
            <h1 style={{ fontFamily: FONT, fontSize: 20, fontWeight: 900, color: "#fff", marginBottom: 10 }}>تم تحديث كلمة المرور</h1>
            <button
              onClick={() => setPage("login")}
              style={{ width: "100%", marginTop: 6, padding: "13px 0", borderRadius: 12, border: "none", fontWeight: 900, fontSize: 14, cursor: "pointer", color: "#000", background: `linear-gradient(135deg,${GOLD},${GOLD2})` }}
            >
              تسجيل الدخول
            </button>
          </div>
        )}
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
