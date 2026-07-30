// src/pages/AdminLogin.jsx
import { useState } from "react";
import { GOLD, GOLD2, BG, FONT } from "../config/theme";
import { signInAdmin } from "../services/authService";

export default function AdminLogin({ onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInAdmin(email, password);
      onSuccess();
    } catch (err) {
      setError("بيانات الدخول غير صحيحة أو الحساب غير مفعّل.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div dir="rtl" style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%", maxWidth: 380,
          background: "linear-gradient(160deg,#120c02,#080602)",
          border: "1px solid rgba(201,150,58,0.3)",
          borderRadius: 20, padding: "30px 26px",
        }}
      >
        <h1 style={{ fontFamily: FONT, fontSize: 22, fontWeight: 900, color: "#fff", marginBottom: 6, textAlign: "center" }}>
          🔐 دخول الأدمن
        </h1>
        <p style={{ color: "#888", fontSize: 13, marginBottom: 24, textAlign: "center" }}>
          هذه الصفحة مخصصة لإدارة الباقات فقط
        </p>

        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="البريد الإلكتروني"
          style={inputStyle}
        />
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="كلمة المرور"
          style={{ ...inputStyle, marginTop: 12 }}
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
          {loading ? "جاري الدخول..." : "دخول"}
        </button>
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
