// src/components/AboutManager.jsx
import { useEffect, useState } from "react";
import { GOLD, GOLD2, GOLD3, FONT } from "../config/theme";
import {
  fetchAboutPage, updateAboutPage, uploadAboutImage,
  fetchSiteSettings, updateSiteSettings, uploadSiteLogo,
  fetchAnnouncement, updateAnnouncement,
} from "../services/aboutService";
import ImageDropzone from "./ImageDropzone";
import Toast from "./Toast";

const fieldStyle = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(201,150,58,0.2)",
  borderRadius: 10,
  padding: "10px 12px",
  color: "#fff",
  fontSize: 13,
  outline: "none",
  marginBottom: 10,
};
const labelStyle = { display: "block", color: GOLD3, fontSize: 12, marginBottom: 6, fontWeight: 700 };

function SaveButton({ saving, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      style={{ padding: "11px 26px", borderRadius: 10, border: "none", fontWeight: 800, color: "#000", background: `linear-gradient(135deg,${GOLD},${GOLD2})`, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
    >
      {saving ? "جاري الحفظ..." : "💾 حفظ"}
    </button>
  );
}

function AboutTab({ flash }) {
  const [form, setForm] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [skillInput, setSkillInput] = useState("");

  useEffect(() => {
    fetchAboutPage().then((data) =>
      setForm({
        ...data,
        skills: data.skills || [],
        stats: data.stats || [],
        social_links: data.social_links || {},
      })
    );
  }, []);

  if (!form) return <p style={{ color: "#888" }}>جاري التحميل...</p>;

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }
  function updateSocial(key, value) {
    setForm((f) => ({ ...f, social_links: { ...f.social_links, [key]: value } }));
  }
  function addSkill() {
    if (!skillInput.trim()) return;
    setForm((f) => ({ ...f, skills: [...f.skills, skillInput.trim()] }));
    setSkillInput("");
  }
  function removeSkill(idx) {
    setForm((f) => ({ ...f, skills: f.skills.filter((_, i) => i !== idx) }));
  }
  function addStat() {
    setForm((f) => ({ ...f, stats: [...f.stats, { label: "", value: "" }] }));
  }
  function updateStat(idx, key, value) {
    setForm((f) => ({ ...f, stats: f.stats.map((s, i) => (i === idx ? { ...s, [key]: value } : s)) }));
  }
  function removeStat(idx) {
    setForm((f) => ({ ...f, stats: f.stats.filter((_, i) => i !== idx) }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      let avatar_url = form.avatar_url;
      let cover_url = form.cover_url;
      if (avatarFile) avatar_url = await uploadAboutImage(avatarFile);
      if (coverFile) cover_url = await uploadAboutImage(coverFile);

      await updateAboutPage({ ...form, avatar_url, cover_url });
      flash("✅ تم حفظ صفحة من نحن");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div>
          <label style={labelStyle}>الصورة الشخصية</label>
          <ImageDropzone previewUrl={form.avatar_url} onFileSelected={setAvatarFile} height={120} />
        </div>
        <div>
          <label style={labelStyle}>صورة الغلاف</label>
          <ImageDropzone previewUrl={form.cover_url} onFileSelected={setCoverFile} height={120} />
        </div>
      </div>

      <label style={labelStyle}>الاسم</label>
      <input style={fieldStyle} value={form.full_name} onChange={(e) => update("full_name", e.target.value)} />

      <label style={labelStyle}>المسمى الوظيفي</label>
      <input style={fieldStyle} value={form.job_title} onChange={(e) => update("job_title", e.target.value)} />

      <label style={labelStyle}>النبذة</label>
      <textarea rows={4} style={{ ...fieldStyle, resize: "vertical" }} value={form.bio} onChange={(e) => update("bio", e.target.value)} />

      <label style={labelStyle}>المهارات</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        {form.skills.map((s, i) => (
          <span key={i} style={{ background: "rgba(201,150,58,0.12)", color: GOLD3, borderRadius: 8, padding: "4px 10px", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
            {s} <button onClick={() => removeSkill(i)} style={{ background: "none", border: "none", color: "#ff8080", cursor: "pointer" }}>×</button>
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input style={{ ...fieldStyle, flex: 1 }} value={skillInput} onChange={(e) => setSkillInput(e.target.value)} placeholder="أضف مهارة واضغط Enter" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())} />
        <button onClick={addSkill} style={{ ...fieldStyle, width: "auto", padding: "10px 16px", cursor: "pointer" }}>إضافة</button>
      </div>

      <label style={{ ...labelStyle, marginTop: 14 }}>الإحصائيات</label>
      {form.stats.map((s, i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input style={{ ...fieldStyle, marginBottom: 0, flex: 1 }} placeholder="القيمة (مثال: 120+)" value={s.value} onChange={(e) => updateStat(i, "value", e.target.value)} />
          <input style={{ ...fieldStyle, marginBottom: 0, flex: 1 }} placeholder="الوصف (مثال: عميل)" value={s.label} onChange={(e) => updateStat(i, "label", e.target.value)} />
          <button onClick={() => removeStat(i)} style={{ background: "none", border: "1px solid rgba(255,80,80,0.35)", color: "#ff8080", borderRadius: 8, padding: "0 12px", cursor: "pointer" }}>×</button>
        </div>
      ))}
      <button onClick={addStat} style={{ background: "none", border: "1px solid rgba(201,150,58,0.3)", color: GOLD3, borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12, marginBottom: 14 }}>➕ إضافة إحصائية</button>

      <label style={labelStyle}>الروابط الاجتماعية</label>
      {["facebook", "instagram", "twitter", "linkedin", "tiktok"].map((k) => (
        <input key={k} style={fieldStyle} placeholder={k} value={form.social_links[k] || ""} onChange={(e) => updateSocial(k, e.target.value)} />
      ))}

      <label style={labelStyle}>رابط السيرة الذاتية (CV)</label>
      <input style={fieldStyle} value={form.cv_url || ""} onChange={(e) => update("cv_url", e.target.value)} placeholder="https://..." />

      <SaveButton saving={saving} onClick={handleSave} />
    </div>
  );
}

function SettingsTab({ flash }) {
  const [form, setForm] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [numberInput, setNumberInput] = useState("");

  useEffect(() => {
    fetchSiteSettings().then((data) =>
      setForm({ ...data, whatsapp_numbers: data.whatsapp_numbers || [], social_links: data.social_links || {} })
    );
  }, []);

  if (!form) return <p style={{ color: "#888" }}>جاري التحميل...</p>;

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }
  function updateSocial(key, value) {
    setForm((f) => ({ ...f, social_links: { ...f.social_links, [key]: value } }));
  }
  function addNumber() {
    if (!numberInput.trim()) return;
    setForm((f) => ({ ...f, whatsapp_numbers: [...f.whatsapp_numbers, numberInput.trim()] }));
    setNumberInput("");
  }
  function removeNumber(idx) {
    setForm((f) => ({ ...f, whatsapp_numbers: f.whatsapp_numbers.filter((_, i) => i !== idx) }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      let logo_url = form.logo_url;
      if (logoFile) logo_url = await uploadSiteLogo(logoFile);
      await updateSiteSettings({ ...form, logo_url });
      flash("✅ تم حفظ الإعدادات");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <label style={labelStyle}>اسم الموقع</label>
      <input style={fieldStyle} value={form.site_name} onChange={(e) => update("site_name", e.target.value)} />

      <label style={labelStyle}>اللوجو</label>
      <ImageDropzone previewUrl={form.logo_url} onFileSelected={setLogoFile} height={110} />

      <label style={{ ...labelStyle, marginTop: 14 }}>أرقام الواتساب</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        {form.whatsapp_numbers.map((n, i) => (
          <span key={i} style={{ background: "rgba(201,150,58,0.12)", color: GOLD3, borderRadius: 8, padding: "4px 10px", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
            {n} <button onClick={() => removeNumber(i)} style={{ background: "none", border: "none", color: "#ff8080", cursor: "pointer" }}>×</button>
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input style={{ ...fieldStyle, flex: 1 }} value={numberInput} onChange={(e) => setNumberInput(e.target.value)} placeholder="201XXXXXXXXX" />
        <button onClick={addNumber} style={{ ...fieldStyle, width: "auto", padding: "10px 16px", cursor: "pointer" }}>إضافة</button>
      </div>

      <label style={labelStyle}>البريد الإلكتروني</label>
      <input style={fieldStyle} value={form.email} onChange={(e) => update("email", e.target.value)} />

      <label style={labelStyle}>الروابط الاجتماعية</label>
      {["facebook", "instagram", "twitter", "linkedin", "tiktok"].map((k) => (
        <input key={k} style={fieldStyle} placeholder={k} value={form.social_links[k] || ""} onChange={(e) => updateSocial(k, e.target.value)} />
      ))}

      <label style={{ ...labelStyle, marginTop: 14 }}>إعدادات SEO</label>
      <input style={fieldStyle} placeholder="عنوان SEO" value={form.seo_title} onChange={(e) => update("seo_title", e.target.value)} />
      <textarea rows={3} style={{ ...fieldStyle, resize: "vertical" }} placeholder="وصف SEO" value={form.seo_description} onChange={(e) => update("seo_description", e.target.value)} />

      <SaveButton saving={saving} onClick={handleSave} />
    </div>
  );
}

function AnnouncementTab({ flash }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAnnouncement().then(setForm);
  }, []);

  if (!form) return <p style={{ color: "#888" }}>جاري التحميل...</p>;

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await updateAnnouncement({
        is_active: form.is_active,
        message: form.message,
        link_url: form.link_url,
        link_label: form.link_label,
      });
      setForm(updated);
      flash("✅ تم حفظ الإعلان");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, background: "rgba(255,255,255,0.03)", padding: "10px 14px", borderRadius: 10 }}>
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(e) => update("is_active", e.target.checked)}
          style={{ width: 18, height: 18, cursor: "pointer" }}
        />
        <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>
          {form.is_active ? "🟢 الإعلان ظاهر للزوار دلوقتي" : "⚪ الإعلان متوقف — مش ظاهر للزوار"}
        </span>
      </div>

      <label style={labelStyle}>نص الإعلان / العرض</label>
      <textarea
        rows={3}
        style={{ ...fieldStyle, resize: "vertical" }}
        placeholder="مثال: خصم 20% على تصميم الهوية البصرية لفترة محدودة 🎉"
        value={form.message}
        onChange={(e) => update("message", e.target.value)}
      />

      <label style={labelStyle}>رابط (اختياري)</label>
      <input
        style={fieldStyle}
        placeholder="https://wa.me/20..."
        value={form.link_url || ""}
        onChange={(e) => update("link_url", e.target.value)}
      />

      <label style={labelStyle}>نص الرابط (اختياري)</label>
      <input
        style={fieldStyle}
        placeholder="اطلب العرض الآن"
        value={form.link_label || ""}
        onChange={(e) => update("link_label", e.target.value)}
      />

      <p style={{ color: "#666", fontSize: 11.5, marginBottom: 14, lineHeight: 1.8 }}>
        💡 الإعلان بيظهر كشريط فوق الموقع، وبيختفي تلقائيًا بعد دقيقتين لو الزائر ماقفلوش بنفسه.
        لو عايز تلغيه فورًا لكل الزوار، شيل علامة "الإعلان ظاهر" من فوق واحفظ.
      </p>

      <SaveButton saving={saving} onClick={handleSave} />
    </div>
  );
}

export default function AboutManager() {
  const [tab, setTab] = useState("about");
  const [toastMsg, setToastMsg] = useState("");

  function flash(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 2500);
  }

  return (
    <div dir="rtl">
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {[
          { id: "about", label: "👤 من نحن" },
          { id: "settings", label: "⚙️ إعدادات الموقع" },
          { id: "announcement", label: "📣 العروض والإشعارات" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "8px 16px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700,
              border: `1px solid ${tab === t.id ? GOLD : "rgba(255,255,255,0.1)"}`,
              background: tab === t.id ? "rgba(201,150,58,0.12)" : "none",
              color: tab === t.id ? GOLD3 : "#aaa",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 560 }}>
        {tab === "about" && <AboutTab flash={flash} />}
        {tab === "settings" && <SettingsTab flash={flash} />}
        {tab === "announcement" && <AnnouncementTab flash={flash} />}
      </div>

      {toastMsg && <Toast toast={{ type: "success", text: toastMsg }} onClose={() => setToastMsg("")} />}
    </div>
  );
}
