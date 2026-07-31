// src/components/ImageDropzone.jsx
// مكوّن مشترك: رفع صورة بالسحب والإفلات أو بالاختيار العادي، مع معاينة قبل الرفع.
import { useRef, useState } from "react";
import { GOLD, GOLD3 } from "../config/theme";

export default function ImageDropzone({ previewUrl, onFileSelected, label = "اسحب صورة هنا أو اضغط للاختيار", height = 160 }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [localPreview, setLocalPreview] = useState(null);

  function handleFiles(files) {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    setLocalPreview(URL.createObjectURL(file));
    onFileSelected(file);
  }

  const shown = localPreview || previewUrl;

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      style={{
        height,
        borderRadius: 14,
        border: `2px dashed ${dragOver ? GOLD : "rgba(201,150,58,0.35)"}`,
        background: shown ? `url(${shown}) center/cover no-repeat` : "rgba(255,255,255,0.02)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
        transition: "border-color .15s ease",
      }}
    >
      {!shown && (
        <span style={{ color: GOLD3, fontSize: 12.5, textAlign: "center", padding: "0 16px" }}>{label}</span>
      )}
      {shown && (
        <div
          style={{
            position: "absolute", inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex", alignItems: "flex-end", justifyContent: "center",
            opacity: 0, transition: "opacity .15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = 0)}
        >
          <span style={{ color: "#fff", fontSize: 12, paddingBottom: 10 }}>اضغط لتغيير الصورة</span>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
