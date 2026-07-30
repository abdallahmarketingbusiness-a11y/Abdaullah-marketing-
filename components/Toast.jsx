// src/pages/Toast.jsx
import { useEffect } from "react";
import { GOLD } from "../config/theme";

// استخدام: const [toast, setToast] = useState(null);
// setToast({ type: "success", text: "تم الحفظ" })  ثم  <Toast toast={toast} onClose={() => setToast(null)} />
export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 3200);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;

  const isError = toast.type === "error";

  return (
    <div
      dir="rtl"
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        padding: "14px 22px",
        borderRadius: 14,
        fontSize: 14,
        fontWeight: 700,
        color: isError ? "#ff8080" : "#000",
        background: isError ? "rgba(30,10,10,0.95)" : `linear-gradient(135deg,${GOLD},#E8BE6A)`,
        border: isError ? "1px solid rgba(255,80,80,0.4)" : "none",
        boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
        animation: "fadeUp .3s ease both",
        maxWidth: "90vw",
        textAlign: "center",
      }}
    >
      {toast.text}
    </div>
  );
}
