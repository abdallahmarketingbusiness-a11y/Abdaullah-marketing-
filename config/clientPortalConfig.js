// src/config/clientPortalConfig.js
//
// وصف كل قسم من أقسام "لوحة تحكم العميل" (غير التحليلات، ليها ملفها الخاص).
// كل قسم = جدول واحد في Supabase + مجموعة حقول. الملف ده بيغذّي:
//   - components/ClientPortalManager.jsx (نموذج الإضافة/التعديل في السوبر أدمن)
//   - services/clientPortalAdminService.js (نفس المفاتيح كأسماء أعمدة الجدول)
//
// عشان تضيف قسم جديد لاحقًا: ضيف تعريف هنا + الجدول المقابل في SQL، خلاص كل
// حاجة تانية (فورم الأدمن، القائمة) بتتولد تلقائيًا.

// ملحوظة: قسم "حالة الاشتراك" اتشال من هنا عمدًا — بقى بيتغذّى مباشرة من
// جدول package_subscriptions الحقيقي (نفس نظام "الاشتراكات" في السوبر أدمن)
// بدل جدول client_subscriptions المنفصل القديم. إدارته بقت من تبويب
// "الاشتراكات" فقط (components/SubscriptionsManager.jsx) — شوف
// createManualSubscription في services/subscriptionAdminService.js لإضافة
// اشتراك يدوي لعميل من هناك.
export const PORTAL_SECTIONS = [
  {
    key: "performance",
    label: "مؤشرات الأداء",
    icon: "🎯",
    table: "performance_kpis",
    dateField: "created_at",
    titleField: "label",
    fields: [
      { key: "label", label: "اسم المؤشر", type: "text", default: "" },
      { key: "value", label: "القيمة الحالية", type: "number", default: 0 },
      { key: "target", label: "الهدف", type: "number", default: 100 },
      { key: "unit", label: "الوحدة", type: "text", default: "%", placeholder: "% أو رقم" },
      { key: "sort_order", label: "ترتيب الظهور", type: "number", default: 0 },
    ],
  },
  {
    key: "campaigns",
    label: "الحملات الإعلانية",
    icon: "📢",
    table: "campaigns",
    dateField: "created_at",
    titleField: "name",
    fields: [
      { key: "name", label: "اسم الحملة", type: "text", default: "" },
      { key: "platform", label: "المنصة", type: "text", default: "", placeholder: "فيسبوك / إنستجرام / تيك توك..." },
      {
        key: "status", label: "الحالة", type: "select", default: "نشطة",
        options: ["نشطة", "متوقفة مؤقتًا", "منتهية"],
      },
      { key: "budget", label: "الميزانية (ج.م)", type: "number", default: 0 },
      { key: "spend", label: "الإنفاق (ج.م)", type: "number", default: 0 },
      { key: "reach", label: "الوصول (Reach)", type: "number", default: 0 },
      { key: "impressions", label: "مرات الظهور (Impressions)", type: "number", default: 0 },
      { key: "ctr", label: "نسبة النقر CTR (%)", type: "number", default: 0, placeholder: "مثال: 2.35" },
      { key: "cpc", label: "تكلفة النقرة CPC (ج.م)", type: "number", default: 0 },
      { key: "leads", label: "عدد العملاء المحتملين (Leads)", type: "number", default: 0 },
      { key: "roi", label: "العائد على الاستثمار ROI (%)", type: "number", default: 0, placeholder: "مثال: 180 يعني 180%" },
      { key: "notes", label: "ملاحظات", type: "textarea", default: "", placeholder: "أي ملاحظات إضافية عن الحملة تظهر للعميل..." },
    ],
  },
  {
    key: "reports",
    label: "التقارير",
    icon: "📄",
    table: "reports",
    dateField: "report_date",
    titleField: "title",
    fields: [
      { key: "title", label: "عنوان التقرير", type: "text", default: "" },
      { key: "report_date", label: "التاريخ", type: "date", default: "" },
      { key: "summary", label: "ملخص التقرير", type: "textarea", default: "" },
    ],
  },
  {
    key: "files",
    label: "الملفات",
    icon: "🗂️",
    table: "client_files",
    dateField: "file_date",
    titleField: "name",
    fields: [
      { key: "name", label: "اسم الملف", type: "text", default: "" },
      {
        key: "file_type", label: "نوع الملف", type: "select", default: "default",
        options: ["pdf", "image", "video", "design", "sheet", "default"],
        optionLabels: {
          pdf: "📄 PDF",
          image: "🖼️ صورة",
          video: "🎬 فيديو",
          design: "🎨 ملف تصميم (PSD / AI / Sketch / Figma...)",
          sheet: "📊 جدول بيانات (Excel / CSV)",
          default: "📁 ملف عام",
        },
      },
      { key: "size_label", label: "الحجم", type: "text", default: "", placeholder: "مثال: 4.2 MB" },
      { key: "file_url", label: "رابط التحميل", type: "text", default: "", placeholder: "رابط مباشر للملف (Google Drive, Supabase Storage...)" },
      { key: "file_date", label: "التاريخ", type: "date", default: "" },
    ],
  },
  {
    key: "scripts",
    label: "السكربتات",
    icon: "✍️",
    table: "content_scripts",
    dateField: "created_at",
    titleField: "title",
    fields: [
      { key: "title", label: "عنوان السكربت", type: "text", default: "" },
      { key: "platform", label: "المنصة", type: "text", default: "" },
      {
        key: "status", label: "الحالة", type: "select", default: "مسودة",
        options: ["مسودة", "قيد المراجعة", "معتمد"],
      },
      { key: "excerpt", label: "نص السكربت", type: "textarea", default: "" },
    ],
  },
  {
    key: "notes",
    label: "الملاحظات",
    icon: "🗒️",
    table: "client_notes",
    dateField: "note_date",
    titleField: "text_content",
    fields: [
      { key: "author", label: "الكاتب", type: "text", default: "فريق أبو الله ماركتينج" },
      { key: "note_date", label: "التاريخ", type: "date", default: "" },
      { key: "text_content", label: "نص الملاحظة", type: "textarea", default: "" },
    ],
  },
  {
    key: "invoices",
    label: "الفواتير",
    icon: "🧾",
    table: "invoices",
    dateField: "invoice_date",
    titleField: "invoice_number",
    fields: [
      { key: "invoice_number", label: "رقم الفاتورة", type: "text", default: "" },
      { key: "invoice_date", label: "التاريخ", type: "date", default: "" },
      { key: "amount", label: "المبلغ (ج.م)", type: "number", default: 0 },
      {
        key: "status", label: "الحالة", type: "select", default: "مستحقة",
        options: ["مستحقة", "مدفوعة", "متأخرة"],
      },
    ],
  },
  // ملحوظة: قسم "الإشعارات" اتشال من هنا — بقى ليه تبويب مخصص في لوحة
  // الأدمن ("🔔 الإشعارات" — components/NotificationsManager.jsx) بيدعم
  // حاجات مش موجودة في النظام العام هنا: الإرسال لكل العملاء دفعة واحدة،
  // والجدولة. شوف services/notificationsAdminService.js.
];

export function getSectionConfig(key) {
  return PORTAL_SECTIONS.find((s) => s.key === key) || null;
}

export function emptyFormFromFields(fields, defaults = {}) {
  const form = {};
  fields.forEach((f) => {
    form[f.key] = defaults[f.key] !== undefined ? defaults[f.key] : f.default;
  });
  return form;
}
