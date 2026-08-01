// src/components/GalleryDropzone.jsx
// مكوّن رفع صور متعددة (معرض) — بيستخدم في قسم "🖼️ المنشورات" عشان يدعم
// أكتر من صورة للمنشور الواحد، غير صورة الغلاف الرئيسية.
import { useRef } from "react";
import { GOLD3 } from "../config/theme";

// items: [{ id, url, file? }] — لو فيه file يبقى صورة جديدة لسه ماترفعتش،
// لو مفيهوش يبقى صورة موجودة بالفعل (url من قبل).
export default function GalleryDropzone({ items, onChange }) {
  const inputRef = useRef(null);

  function addFiles(files) {
    const newItems = Array.from(files || [])
      .filter((f) => f.type.startsWith("image/"))
      .map((f) => ({ id: crypto.randomUUID(), url: URL.createObjectURL(f), file: f }));
    onChange([...items, ...newItems]);
  }

  function remove(id) {
    onChange(items.filter((it) => it.id !== id));
  }

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        {items.map((it) => (
          <div key={it.id} style={{ position: "relative", width: 64, height: 64 }}>
            <img src={it.url} alt="" style={{ width: 64, height: 64, borderRadius: 10, objectFit: "cover" }} />
            <button
              type="button"
              onClick={() => remove(it.id)}
              style={{
                position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%",
                background: "#ff4d4d", color: "#fff", border: "none", cursor: "pointer", fontSize: 11, lineHeight: "20px",
              }}
            >
              ×
            </button>
          </div>
        ))}
        <div
          onClick={() => inputRef.current?.click()}
          style={{
            width: 64, height: 64, borderRadius: 10, border: "2px dashed rgba(201,150,58,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: GOLD3, fontSize: 22,
          }}
        >
          +
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
      />
    </div>
  );
}
