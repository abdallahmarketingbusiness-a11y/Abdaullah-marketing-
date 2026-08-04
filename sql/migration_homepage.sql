-- ============================================================================
-- إدارة الصفحة الرئيسية (Homepage Sections CMS)
-- ملحوظة: الملف ده إضافي، بيبني فوق schema.sql الأساسي (جدول admins و
-- is_admin() لازم يكونوا موجودين قبله). شغّل الكويري ده مرة واحدة في
-- Supabase SQL editor.
--
-- الفكرة: صف واحد لكل قسم في الصفحة الرئيسية —
--   kind = 'core'   → قسم موجود أصلاً في الكود (Hero, الخدمات, الأسعار...)
--                      وممكن تتحكم في: النصوص/الصور/الأزرار/الإظهار/الترتيب.
--   kind = 'custom' → قسم جديد بالكامل بيضيفه الأدمن (بانر / عرض / خصم / إعلان)
--                      وممكن يتحذف في أي وقت وينضاف في أي مكان بالترتيب.
--
-- عمود content هو JSONB مرن بيشيل كل حاجة (عنوان فرعي، عنوان، نص، صورة،
-- عناصر Cards، أزرار...) — كل قسم بياخد من الحقول اللي يحتاجها بس.
-- ============================================================================

create table if not exists homepage_sections (
  id uuid primary key default gen_random_uuid(),
  section_key text not null unique,
  kind text not null default 'custom' check (kind in ('core', 'custom')),
  custom_type text check (custom_type in ('banner', 'offer', 'discount', 'ad', 'text') or custom_type is null),
  is_visible boolean not null default true,
  sort_order integer not null default 0,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_homepage_sections_sort on homepage_sections(sort_order);

alter table homepage_sections enable row level security;

-- القراءة: أي حد يشوف الأقسام الظاهرة بس، الأدمن يشوف كل حاجة (حتى المخفي)
drop policy if exists homepage_sections_select on homepage_sections;
create policy homepage_sections_select on homepage_sections
  for select
  using (is_visible = true or is_admin());

-- الكتابة: أدمن فقط (إضافة/تعديل/حذف/ترتيب)
drop policy if exists homepage_sections_write on homepage_sections;
create policy homepage_sections_write on homepage_sections
  for all
  using (is_admin())
  with check (is_admin());

-- ============================================================================
-- تعبئة الأقسام العشرة الحالية بمحتواها الأصلي (نفس النصوص الموجودة في
-- الكود دلوقتي) — عشان الموقع ميتغيرش شكله لحظة تفعيل النظام. أي قسم فيها
-- الأدمن يقدر يعدّل نصه/صورته/أزراره أو يخفيه أو يغيّر ترتيبه بعد كده.
-- ============================================================================
insert into homepage_sections (section_key, kind, is_visible, sort_order, content) values
('hero', 'core', true, 0, '{
  "eyebrow": "✦ SOCIAL MEDIA MARKETING · أسيوط ✦",
  "subtitle": "نحوّل حضورك الرقمي إلى محرك نمو حقيقي — محتوى احترافي، إدارة ذكية، ونتائج تُقاس بالأرقام",
  "buttons": [
    {"label": "🚀 ابدأ رحلتك معنا", "url": "https://wa.me/201069032563"},
    {"label": "📦 الباقات", "url": "#pricing"},
    {"label": "📁 الباقات المخصصة", "url": "#gallery"}
  ],
  "items": [
    {"title": "+5", "desc": "عملاء راضون"},
    {"title": "3+", "desc": "مجالات متخصصة"},
    {"title": "6", "desc": "خدمات احترافية"},
    {"title": "24/7", "desc": "دعم مستمر"}
  ]
}'::jsonb),

('posts-feed', 'core', true, 1, '{
  "eyebrow": "LATEST UPDATES",
  "title": "أحدث المنشورات",
  "subtitle": "نصائح، عروض، وأخبار بنشاركها معاك أول بأول"
}'::jsonb),

('services', 'core', true, 2, '{
  "eyebrow": "OUR SERVICES",
  "title": "خدماتنا الاحترافية",
  "subtitle": "حلول متكاملة تحوّل علامتك التجارية إلى قوة رقمية لا تُنافَس",
  "buttons": [{"label": "💬 احجز استشارة مجانية الآن", "url": "https://wa.me/201069032563"}]
}'::jsonb),

('case-study', 'core', true, 3, '{
  "eyebrow": "FEATURED CASE STUDY",
  "title": "آخر أعمالنا",
  "subtitle": "دراسة حالة كاملة توضح كيف حوّلنا فكرة مطعم إلى تجربة رقمية متكاملة",
  "client_name": "La Casa De Burger",
  "body": "قمنا بتصميم وتطوير موقع إلكتروني احترافي لمطعم La Casa De Burger بهدف تقديم تجربة رقمية حديثة للعملاء، مع عرض المنيو بشكل منظم، وسهولة الوصول للطلبات عبر QR Code وWhatsApp، مع الحفاظ على الهوية البصرية للمطعم وتحسين تجربة المستخدم على جميع الأجهزة.",
  "image_url": "/images/lcdb-website.jpg",
  "buttons": [
    {"label": "🌐 زيارة الموقع", "url": "https://lacasa-de-burger-website.vercel.app/"},
    {"label": "ابدأ مشروع مشابه", "url": "https://wa.me/201069032563"}
  ],
  "items": [
    {"icon": "💻", "title": "تصميم وتطوير موقع إلكتروني احترافي"},
    {"icon": "🎨", "title": "تصميم واجهة وتجربة المستخدم (UI/UX)"},
    {"icon": "📖", "title": "إنشاء منيو رقمي احترافي"},
    {"icon": "📱", "title": "دمج QR Code للوصول السريع للمنيو"},
    {"icon": "💬", "title": "ربط الطلبات عبر WhatsApp"},
    {"icon": "📐", "title": "تصميم متجاوب مع الهاتف والتابلت والكمبيوتر"},
    {"icon": "⚡", "title": "تحسين سرعة وأداء الموقع"},
    {"icon": "🗂️", "title": "تنظيم وتصميم أقسام المنيو"},
    {"icon": "🚀", "title": "نشر الموقع واستضافته"},
    {"icon": "✨", "title": "تحسين الهوية الرقمية للمطعم"}
  ]
}'::jsonb),

('portfolio', 'core', true, 4, '{
  "eyebrow": "MY WORK",
  "title": "أعمالي الحقيقية",
  "subtitle": "تصاميم ومحتوى نفّذته لعملاء حقيقيين في مجالات مختلفة"
}'::jsonb),

('tips', 'core', true, 5, '{
  "eyebrow": "TIPS & INSIGHTS",
  "title": "نصائح للمشاريع",
  "subtitle": "خلاصة تجربتي — نصائح عملية تساعدك تنمو رقمياً بشكل أسرع وأذكى",
  "items": [
    {"icon": "🎯", "title": "اعرف جمهورك قبل أي خطوة", "desc": "قبل ما تبدأ أي حملة، لازم تعرف مين بالضبط بتخاطبه — العمر، الاهتمامات، المشاكل. المحتوى المخصص بيوصل أكتر من ميزانية إعلانية كاملة.", "tag": "AUDIENCE FIRST"},
    {"icon": "📅", "title": "الانتظام أقوى من الجودة المتقطعة", "desc": "نشر محتوى متوسط بانتظام أفضل من محتوى ممتاز متقطع. الخوارزميات بتكافئ الحسابات النشطة. اعمل تقويم محتوى وإلتزم بيه.", "tag": "CONSISTENCY"},
    {"icon": "📊", "title": "اتابع الأرقام دايماً", "desc": "التسويق بدون تحليل زي القيادة بدون مرايا. راجع إنسايتس كل أسبوع — أكتر بوست نجح ليه نجح؟ الأرقام هي اللي بتقولك تحسن إيه.", "tag": "DATA DRIVEN"},
    {"icon": "🎬", "title": "الفيديو ملك المحتوى دلوقتي", "desc": "الريلز بتحقق وصولاً عضوياً أضعاف الصور. حتى فيديو بسيط بمحتوى قيّم هيوصل أكتر من تصميم فاخر. ابدأ بالريلز قبل أي شيء تاني.", "tag": "VIDEO FIRST"},
    {"icon": "💬", "title": "التفاعل مع الجمهور استثمار", "desc": "الرد على التعليقات والرسائل بسرعة مش مجرد أدب — ده بيخلي الخوارزمية تحب صفحتك وبيبني ثقة حقيقية مع متابعينك.", "tag": "ENGAGEMENT"},
    {"icon": "🌟", "title": "الهوية البصرية استثمار مش مصروف", "desc": "الهوية البصرية الواضحة بتوفر عليك وقت التصميم وبتخلي الجمهور يميزك فوراً وسط الزحام. ده استثمار بيرجع عليك أضعافه.", "tag": "BRAND IDENTITY"}
  ]
}'::jsonb),

('pricing', 'core', true, 6, '{
  "eyebrow": "PRICING PLANS",
  "title": "اختار الباقة اللي تناسبك",
  "subtitle": "باقات مصممة خصيصاً لكل نوع أعمال — من البداية للاحتراف الكامل"
}'::jsonb),

('why', 'core', true, 7, '{
  "eyebrow": "WHY US",
  "title": "لماذا تختار Abdullah Marketing؟",
  "items": [
    {"icon": "🎯", "title": "نتائج حقيقية وقابلة للقياس", "desc": "لا وعود فارغة — أهداف واضحة وتقارير شهرية تُثبت النمو الفعلي."},
    {"icon": "⚡", "title": "خبرة في أكثر من مجال", "desc": "من المطاعم إلى الفاشن — فهم عميق لكل قطاع وجمهوره."},
    {"icon": "🤝", "title": "شراكة لا مجرد خدمة", "desc": "نتعامل مع كل عميل كشريك استراتيجي ونبني معه الخطة خطوة بخطوة."},
    {"icon": "✨", "title": "محتوى يتميز وسط الزحام", "desc": "نصنع ما يُوقف التمرير ويخلق انطباعاً لا يُنسى عن علامتك."}
  ]
}'::jsonb),

('testimonials', 'core', true, 8, '{
  "eyebrow": "CLIENT VOICE",
  "title": "آراء العملاء",
  "subtitle": "ثقة عملائنا هي أكبر دليل على جودة العمل",
  "client_name": "La Casa De Burger",
  "sub_label": "La Casa De Burger — Restaurant",
  "body": "ساعدنا عبدالله في تصميم موقع احترافي يعرض المنيو بشكل أفضل وسهّل وصول العملاء للطلبات عبر QR Code. التجربة كانت ممتازة والتعامل احترافي.",
  "image_url": "/images/lcdb-13.jpg"
}'::jsonb),

('process', 'core', true, 9, '{
  "eyebrow": "HOW WE WORK",
  "title": "آلية العمل",
  "subtitle": "أربع خطوات من التواصل الأول حتى النتائج",
  "items": [
    {"icon": "💬", "title": "التواصل والفهم", "desc": "نتعرف على علامتك وأهدافك وجمهورك المستهدف"},
    {"icon": "📋", "title": "بناء الاستراتيجية", "desc": "خطة محتوى مخصصة تناسب مجالك ومنصاتك"},
    {"icon": "🚀", "title": "التنفيذ والنشر", "desc": "تصميم، فيديو، كتابة، جدولة — كل شيء باحترافية"},
    {"icon": "📊", "title": "التحليل والتطوير", "desc": "نتابع النتائج ونحسّن الأداء باستمرار"}
  ]
}'::jsonb)

on conflict (section_key) do nothing;

-- ============================================================================
