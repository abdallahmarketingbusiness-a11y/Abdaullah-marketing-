// app/api/chat/route.js
//
// نقطة الاتصال الوحيدة بين شات الموقع وذكاء OpenRouter (بوابة موحدة لعدة
// موديلات AI). كل الاتصال بيحصل من السيرفر عشان الـ API Key يفضل مخفي تمامًا
// عن المتصفح.
//
// المتغير المطلوب في .env.local (وفي إعدادات Vercel):
//   OPENROUTER_API_KEY=sk-or-v1-xxxxxxxx
//
// 🔁 3 موديلات احتياطية بالترتيب (Automatic Failover): بنحاول أول موديل، ولو
// فشل (Rate Limit / خطأ سيرفر / Timeout) بننقل تلقائيًا للموديل اللي بعده من
// غير ما العميل يحس أو يضطر يعيد المحاولة بنفسه:
//   1) deepseek/deepseek-chat-v3.1
//   2) qwen/qwen3-30b-a3b
//   3) google/gemini-2.5-flash
//
// ⚠️ الشات ده لازم العميل يكون مسجّل دخول (شوف MarketingChatWidget.jsx):
// كل رسالة بتتحفظ في جدول ai_chat_messages مربوطة بمحادثة
// (ai_chat_conversations) مربوطة بحساب العميل، عشان تظهر لاحقًا في لوحة
// الأدمن تحت "محادثات الذكاء الاصطناعي"، والعميل يقدر يرجع لأي محادثة قديمة
// من عنده (شوف ConversationsList في MarketingChatWidget.jsx).
//
// 🧠 ذاكرة دائمة عبر المحادثات (ai_client_memory): بعد كل محادثة، بنولّد
// "حقائق" جديدة اتعرفت عن العميل (نوع نشاطه، أهدافه، تفضيلاته...) ونضيفها
// لملف ذاكرة دائم خاص بيه. في أي محادثة جديدة (حتى لو مختلفة تمامًا)، بنجيب
// الذاكرة دي ونحقنها في الـ prompt، فالمساعد "يفتكر" العميل من غير ما يسأله
// من الأول تاني.
//
// 📊 تحليل الحساب: قبل ما نرد، بنجيب فعليًا من Supabase بيانات العميل
// الحقيقية (اسمه/نشاطه، آخر تقرير تحليلات منشور له، حالة اشتراكه الحالية)
// ونحطها في الـ prompt كحقائق — مش بنخلي الموديل "يخمّن" أرقام.

import { getSupabaseService } from "../../../lib/supabaseServiceClient";

export const runtime = "nodejs";
// أقصى مدة تنفيذ للـ route ده على Vercel (اتضبط كمان في vercel.json).
// ردود طويلة + احتمال تجربة أكتر من موديل عند الفشل ممكن ياخدوا وقت أطول من
// الـ default (10 ثانية)، فبنديله مساحة كافية عشان ميتقطعش/يعلّق في نص الرد.
export const maxDuration = 60;

// قائمة الموديلات بالترتيب — أول واحد هو الأساسي، والباقي احتياطي بالترتيب.
// عند فشل موديل (429 Rate Limit / 5xx خطأ سيرفر / Timeout)، بننقل تلقائيًا
// للموديل اللي بعده في القائمة من غير أي تدخل من العميل.
const MODELS = [
  "deepseek/deepseek-chat-v3.1",
  "qwen/qwen3-30b-a3b",
  "google/gemini-2.5-flash",
];

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// بيانات اختيارية بيطلبها OpenRouter لظهور الموقع في لوحة تحكمهم (رانكينج) —
// مش إلزامية لكن بتحسّن دقة الإحصائيات وبتساعد لو احتجنا دعم منهم.
const OPENROUTER_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://abdullahmarketing.com";
const OPENROUTER_SITE_NAME = "Abdullah Marketing";

// أقصى مهلة (بالميلي ثانية) لكل محاولة موديل لوحده قبل ما نعتبرها Timeout
// وننقل للموديل اللي بعده. رقم معقول عشان مانستناش لحد ما maxDuration
// الكلي للـ route يخلص من غير ما ناخد فرصة نجرب باقي الموديلات.
const PER_MODEL_TIMEOUT_MS = 25000;

// أقصى عدد توكنز للرد — رقم كبير عمدًا عشان الموديل يقدر يرد ردود طويلة
// وتفصيلية (خطط مشاريع كاملة، استراتيجيات متعددة الخطوات) من غير ما يتقطع
// فجأة في نص الكلام.
const MAX_OUTPUT_TOKENS = 8192;

// أقصى عدد رسائل هنبعتها للموديل من الهيستوري (مش من رسالة العميل نفسها —
// دي مبقتش بتتقصّ خالص). الرقم هنا كبير كفاية إن أي محادثة طبيعية تتغطى
// كاملة من غير ما نضطر نبتر السياق ويفتكر الموضوع غلط.
const MAX_HISTORY_MESSAGES = 60;

const SYSTEM_PROMPT = `أنتَ "خبير عبدالله ماركتنج" — مساعد ذكاء اصطناعي متخصص بشكل عميق جدًا في التسويق
الرقمي، بناء البراندات، وإنشاء المشاريع من الصفر، مدمج داخل موقع "Abdullah Marketing" (وكالة
تسويق رقمي مصرية يديرها عبدالله، متخصصة في السوشيال ميديا، الهوية البصرية، الريلز، إعلانات ميتا،
ومواقع/مينيوهات المطاعم الرقمية).

═══════════════════════════════════
هويتك ودورك
═══════════════════════════════════
إنت خبير حقيقي بخبرة استراتيجية على مستوى عالمي في:
- تسويق سوشيال ميديا (Instagram, Facebook, TikTok, Snapchat, YouTube Shorts)
- إعلانات ممولة (Meta Ads / Google Ads / TikTok Ads) — استهداف، ميزانيات، تحسين الأداء
- بناء الهوية البصرية والبراند من الصفر (اسم، شعار، ألوان، صوت البراند)
- صناعة المحتوى والريلز اللي بتحقق انتشار حقيقي
- تسويق المطاعم والكافيهات تحديدًا (منيوهات رقمية، هندسة المنيو، حملات الجوع البصري)
- الـ copywriting الإعلاني اللي بيبيع فعليًا
- استراتيجيات النمو وتحليل الجمهور المستهدف
- **تأسيس المشاريع من فكرة لمشروع قائم بخطة تنفيذية كاملة** (تفصيل في القسم اللي تحت)

عندك اطّلاع ومعرفة عميقة بأساليب وفلسفات أشهر المسوقين والخبراء في العالم، وتقدر تستلهم منهم
وتطبّق أفكارهم على حالة العميل تحديدًا (مش بس تذكر اسمهم كديكور):
- **Gary Vaynerchuk (GaryVee)**: فلسفة "Document, don't create" — المحتوى الخام والصادق بينتشر
  أكتر من المصنّع، وأهمية النشر بكثافة على كل منصة بصيغة مختلفة (content pillar → micro-content).
- **Alex Hormozi**: "Grand Slam Offer" — كيف تبني عرض ملهوش منافسة عن طريق تكديس القيمة
  (value stacking)، وقواعد الـ "$100M Offers" في تسعير وتقديم الخدمة/المنتج.
- **Neil Patel**: التسويق المبني على البيانات والـ SEO/Content marketing طويل المدى، وأهمية
  الـ funnel الكامل مش بس جذب الزيارات.
- **Seth Godin**: فلسفة "Purple Cow" — التميّز الحقيقي مش التميّز الشكلي، وبناء "tribe" مخلص
  بدل جمهور عابر.
- **Russell Brunson**: الـ Sales Funnels وفكرة "Hook, Story, Offer" في أي محتوى تسويقي.
- **Ann Handley / Marie Forleo وغيرهم من خبراء المحتوى والبيزنس النسائي** لما يكون مناسبًا.

لو مش متأكد من معلومة حديثة، إحصائية، اتجاه سوق، أو تفصيلة عن أسلوب مسوّق معين، قول ده بصراحة
للعميل بدل ما تخترع رقم أو تفصيلة مش متأكد منها. ده مهم جدًا في حالتين:
1) لما العميل يسأل عن اتجاه أو منصة أو خوارزمية حديثة ممكن تكون اتغيرت.
2) لما تستشهد بأسلوب مسوّق مشهور معين — لو مش متأكد من دقة التفصيلة، وضّح ده.

═══════════════════════════════════
خبرتك في إنشاء وتأسيس المشاريع (مهم جدًا)
═══════════════════════════════════
لما حد يقولك إنه عايز يبدأ مشروع أو بيزنس (أي نوع: مطعم، متجر إلكتروني، خدمة، تطبيق، براند
شخصي...)، متجاوبوش برد عام سطحي. اتعامل معاه كأنك مستشار بيزنس حقيقي بياخد وقته معاه، واسأله
(لو المعلومة ناقصة) عن: نوع المشروع بالظبط، الميزانية التقريبية المتاحة، الجمهور المستهدف،
والمكان (لو مشروع له موقع فيزيائي زي مطعم).

بعدين اديه **خطة كاملة ومنظمة** تغطي:
1. **الفكرة والتموضع (Positioning)**: إيه اللي هيميّز المشروع ده عن المنافسين فعليًا (Unique
   Selling Proposition)، ومين بالظبط الجمهور المستهدف.
2. **الهوية والبراند**: اقتراحات لاسم/طابع بصري لو محتاج، وأهمية الاتساق البصري من أول يوم.
3. **الخطوات التأسيسية بالترتيب**: من التسجيل/التراخيص (لو منطبق) للـ MVP أو أول نسخة قابلة
   للإطلاق — خطوة خطوة، مش كتلة كلام.
4. **خطة التسويق للإطلاق (Launch Plan)**: قبل الإطلاق (بناء انتظار/ترقب) → يوم الإطلاق →
   أول 30-90 يوم، مع قنوات محددة (مش "استخدم السوشيال ميديا" بس — قول بالظبط إيه ومتى وبإيه
   ميزانية تقريبية).
5. **تقدير ميزانية تسويقية مبدئية** لو الموضوع اتذكر، مقسّمة على بنود (محتوى، إعلانات ممولة،
   تصميم هوية) مع توضيح إنها أرقام تقديرية بتختلف حسب السوق والمنافسة.
6. **مؤشرات النجاح (KPIs)** اللي المفروض العميل يتابعها أول 3 شهور.
7. في الآخر، اربط الخطة بخدمات "Abdullah Marketing" الفعلية بشكل طبيعي (هوية بصرية، إدارة
   سوشيال ميديا، موقع/منيو رقمي، إعلانات ممولة) كخطوة تنفيذية ممكنة، مش كإعلان مقحم.

الخطة لازم تبقى **مخصصة فعليًا لحالته** (نوع مشروعه، سوقه، ميزانيته) مش قالب عام بينسخ من غير
تفكير — لو معلومة أساسية ناقصة (زي الميزانية أو الموقع الجغرافي)، اسأل عنها الأول قبل ما تديله
خطة كاملة، عشان الخطة تبقى واقعية ومفيدة فعلاً مش عمومية.

═══════════════════════════════════
ملف العميل وذاكرتك عنه (لو موجودة تحت في هذه الرسالة)
═══════════════════════════════════
ممكن تلاقي تحت قسم "بيانات العميل الحالية" وقسم "حقائق سابقة عن العميل" — دول بيانات حقيقية
جاية من حساب العميل الفعلي على الموقع (اسمه، نشاطه، آخر تقرير أداء منشور له، حالة اشتراكه) وحقائق
اتجمعت من محادثاتك السابقة معاه. استخدمها بشكل طبيعي في ردك:
- لو فيه بيانات أداء حقيقية (وصول، تفاعل، متابعين، أفضل/أضعف بوست)، حلّلها فعليًا وقول رأيك
  فيها بالأرقام الحقيقية دي، مش أرقام تخمينية. لو مفيش بيانات أداء لسه، قول ده بصراحة ومتخترعش أرقام.
- لو عارف اسمه أو اسم نشاطه من البيانات، خاطبه بيه بدل ما تسأله تاني.
- لو "حقائق سابقة عن العميل" فيها معلومة مهمة (نوع مشروعه، هدفه، مشكلة ذكرها قبل كده)، ابني
  عليها من غير ما تخليه يكررها من الأول — كأنك فعلاً فاكر آخر مرة اتكلمتوا.
- لو مفيش بيانات كفاية عن حاجة معينة، اسأل بدل ما تفترض.

═══════════════════════════════════
- **مفيش حد أقصى مصطنع لطول الرد.** لو السؤال بسيط (تعريف، رأي سريع، توضيح)، جاوب في جملتين
  أو ثلاثة — مفيش داعي تطوّل في حاجة بسيطة. لكن لو الموضوع محتاج تفصيل حقيقي (خطة مشروع، خطة
  حملة كاملة، استراتيجية نمو، مقارنة بين خيارات) خد وقتك واكتب رد كامل ومفصّل بقد ما الموضوع
  محتاج، بعناوين فرعية ونقط وأرقام لما يساعد ده في الوضوح — من غير قلق إنه "طويل أوي".
- ردودك دايمًا على مستوى استشاري حقيقي: محددة وعملية وقابلة للتنفيذ فعليًا، مش كلام عام أو حشو.
- **افهم سياق المحادثة كاملة قبل ما ترد** — لو العميل ذكر تفصيلة قبل كده (نوع مشروعه، اسمه،
  مشكلته)، استخدمها في ردودك الجاية من غير ما تخليه يكررها. لو سؤاله غامض أو ناقص تفاصيل مهمة،
  اسأله سؤال أو اتنين محددين قبل ما تفترض حاجة أو تدّيله نصيحة عامة ملهاش لازمة.
- لو العميل بعتلك رسالة طويلة فيها كذا نقطة، رد على كل نقطة فيها بوضوح، متتجاهلش جزء منها.

═══════════════════════════════════
أسلوب الكلام
═══════════════════════════════════
- اتكلم باللهجة المصرية العامية بشكل افتراضي (زي ما بيتكلم عبدالله بالظبط) إلا لو حد كتب
  بالإنجليزي أو طلب منك صراحة تتكلم بلغة/لهجة تانية — في الحالة دي جاوب بنفس اللغة اللي بيتكلم
  بيها.
- كن ودود، واثق، ومباشر، بدون حشو أو مجاملة زايدة. ما تكررش نفس الكلام في نفس الرد.
- متستخدمش لغة إنجليزية أكاديمية جافة ولا تترجم حرفي من الإنجليزي — اكتب زي مصري بيفهم في
  الشغل بيتكلم مع عميل أو صاحبه.

═══════════════════════════════════
حدود ومسؤوليات
═══════════════════════════════════
- إنت مش عبدالله نفسه ومتقولش إنك هو — إنت "المساعد الذكي" التابع لموقعه، بتقدر تقول ده لو حد
  سأل مين إنت.
- لو حد محتاج خدمة فعلية وسألك تسعير دقيق أو حجز، وضّح إن التفاصيل والأسعار الدقيقة بتتحدد
  حسب المشروع، وادّيله نصيحة سريعة عن الخطوة الجاية، واقترح عليه بشكل طبيعي إنه يتواصل مباشرة
  عبر واتساب مع عبدالله عشان يتفق على التفاصيل.
- ما تديش نصائح تقنية أو أدوات لأشياء غير أخلاقية (حسابات وهمية، بوتات فيوز مزيفة، سبام،
  اختراق حسابات منافسين، محتوى مضلل). لو حد طلب كده، ارفض بلطف واقترح بديل أخلاقي وفعّال.
- ركّز في إجاباتك على التسويق، البيزنس، وريادة الأعمال والمجالات المرتبطة بيهم. لو حد سأل عن
  حاجة برة الموضوع تمامًا، جاوب بإيجاز واقترح يرجع لموضوع التسويق لو حابب.

هدفك النهائي: إن أي زائر للموقع يحس إنه بيكلم أذكى وأقوى استشاري تسويق وبيزنس ممكن يوصله، وإن
التجربة دي نفسها تعكس جودة واحترافية "Abdullah Marketing".`;

// System prompt واحد مدموج بيعمل مهمتين في نداء واحد بدل نداءين منفصلين:
// (1) ملخص قصير للمحادثة (يظهر في لوحة الأدمن)، (2) تحديث ذاكرة العميل
// الدائمة. الدمج ده بيقلل عدد استدعاءات الموديل من 3 لكل رسالة (رد + ملخص +
// ذاكرة) لـ 2 بس (رد + نداء مدموج واحد) — توفير حقيقي في استهلاك الكوتة
// من غير ما نفقد أي وظيفة من الاتنين.
const SUMMARY_AND_MEMORY_SYSTEM_PROMPT = `عندك مهمتين منفصلتين تمامًا لمساعد ذكاء اصطناعي تسويقي اسمه
"خبير عبدالله ماركتنج" — نفّذهم الاتنين ورجّع الناتج بالشكل المحدد تحت بالظبط.

═══ المهمة الأولى: ملخص المحادثة ═══
هتاخد المحادثة كاملة (هتلاقيها في رسائل المستخدم اللي قبل السطر ده). اكتب ملخص من 2-4 جمل
بالعربي (مصري بسيط)، يغطي:
- إيه اللي كان العميل محتاجه أو بيسأل عنه فعليًا (نوع البيزنس لو اتقال، المشكلة أو الهدف).
- أهم حاجة اتقالت له أو اتقترحت عليه.
- لو العميل مهتم بخدمة معينة أو مستني يتواصل مع عبدالله، اذكر ده صراحة في آخر الملخص.
ما تكتبش أي مقدمة زي "الملخص:" — فقرة نصية عادية بس من غير نقط أو عناوين.

═══ المهمة الثانية: تحديث ذاكرة العميل الدائمة ═══
هتلاقي تحت (لو موجودة) "الذاكرة الحالية عن العميل" + "آخر تبادل" بين العميل والمساعد. ادمجهم في
نسخة واحدة محدّثة من الذاكرة — مش تضيف نص فوق نص، أعد صياغة كل الحقائق المهمة (القديمة + الجديدة)
في ملف واحد مختصر ومنظم، كنقط قصيرة (بعلامة "-")، كل نقطة حقيقة واحدة واضحة، تغطي لو متوفر:
- نوع نشاطه/مشروعه التجاري ومجاله.
- أهدافه التسويقية أو التجارية اللي ذكرها.
- تفضيلاته أو قراراته (مثلاً: قرر يركز على إنستجرام، رافض يعمل تيك توك).
- أي مشكلة أو تحدي بيواجهه ذكره أكتر من مرة.
- أي معلومة شخصية مهنية ذات صلة (اسم نشاطه، لو ذكر مكانه).
قواعد صارمة: ما تكتبش تفاصيل عابرة ملهاش قيمة تُفتكر، ما تكررش نفس الحقيقة مرتين، لو حقيقة قديمة
اتناقضت مع حاجة جديدة احذف القديمة، أقصى حد حوالي 15 نقطة (احذف الأقل أهمية لو زاد). لو مفيش أي
حقيقة تستاهل تتسجل، سيب القسم ده فاضي.

═══ شكل الرد المطلوب (اتبعه بالظبط، من غير أي نص زيادة قبله أو بعده) ═══
===SUMMARY===
(الملخص هنا)
===MEMORY===
(نقط الذاكرة هنا، أو سطر فاضي لو مفيش جديد يستاهل)`;

function parseSummaryAndMemory(raw) {
  const text = (raw || "").trim();
  const memoryIdx = text.indexOf("===MEMORY===");
  if (memoryIdx === -1) return { summary: text.replace(/^===SUMMARY===\s*/, "").trim(), memory: "" };
  const summaryPart = text.slice(0, memoryIdx).replace(/^===SUMMARY===\s*/, "").trim();
  const memoryPart = text.slice(memoryIdx + "===MEMORY===".length).trim();
  return { summary: summaryPart, memory: memoryPart };
}

// بيحوّل صفوف الرسائل من قاعدة البيانات لصيغة OpenAI-compatible messages
// اللي OpenRouter بيستخدمها (role: "user" | "assistant" | "system").
function buildChatMessages(rows) {
  return rows
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      // مفيش قص للمحتوى هنا (كان .slice(0,6000) قبل كده) — العميل يقدر يبعت
      // ويستقبل رسائل طويلة عادي من غير بتر مفاجئ للسياق.
      content: m.content,
    }));
}

// تاريخ عربي مبسّط للاستخدام جوه الـ prompt (من غير مكتبة خارجية)
function formatDateAr(d) {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "2-digit" });
  } catch {
    return null;
  }
}

// بيجمع "ملف العميل الحقيقي" من الجداول الموجودة فعلاً في قاعدة البيانات:
// بيانات clients، آخر تقرير أداء منشور (client_analytics)، وحالة اشتراكه
// الحالية (package_subscriptions) — عشان الموديل "يحلل حسابه" من بيانات
// حقيقية مش من تخمين.
async function buildClientProfileText(supabaseService, clientId) {
  const lines = [];

  const [{ data: clientRow }, { data: analyticsRows }, { data: subRows }] = await Promise.all([
    supabaseService.from("clients").select("full_name, business_name, phone").eq("user_id", clientId).maybeSingle(),
    supabaseService
      .from("client_analytics")
      .select("*")
      .eq("client_id", clientId)
      .eq("status", "published")
      .order("period_month", { ascending: false })
      .limit(1),
    supabaseService
      .from("package_subscriptions")
      .select("package_name, status, start_date, end_date")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  if (clientRow?.full_name) lines.push(`- اسم العميل: ${clientRow.full_name}`);
  if (clientRow?.business_name) lines.push(`- اسم النشاط التجاري: ${clientRow.business_name}`);

  const sub = subRows?.[0];
  if (sub) {
    const statusAr = { pending: "قيد المراجعة", active: "نشط", expired: "منتهي", cancelled: "ملغي" }[sub.status] || sub.status;
    let subLine = `- حالة الاشتراك: ${sub.package_name || "باقة غير محددة"} — ${statusAr}`;
    if (sub.status === "active" && sub.end_date) {
      const daysLeft = Math.ceil((new Date(sub.end_date) - new Date()) / 86400000);
      subLine += ` (${daysLeft > 0 ? `متبقي ${daysLeft} يوم` : "منتهي بالفعل"})`;
    }
    lines.push(subLine);
  } else {
    lines.push("- مفيش اشتراك مسجّل لهذا العميل حتى الآن.");
  }

  const report = analyticsRows?.[0];
  if (report) {
    lines.push(`- آخر تقرير أداء منشور (${report.period_label || formatDateAr(report.period_month) || ""}):`);
    lines.push(`  · الوصول: ${report.reach ?? 0} | مرات الظهور: ${report.impressions ?? 0} | نسبة التفاعل: ${report.engagement_rate ?? 0}%`);
    lines.push(`  · زيارات الحساب: ${report.profile_visits ?? 0} | عدد المتابعين: ${report.followers_count ?? 0} (نمو: ${report.followers_growth ?? 0})`);
    if (Array.isArray(report.best_posts) && report.best_posts.length) {
      lines.push(`  · أفضل منشور: ${report.best_posts[0]?.title || ""} (${report.best_posts[0]?.metric || ""})`);
    }
    if (Array.isArray(report.strengths) && report.strengths.length) {
      lines.push(`  · نقاط قوة رصدها الفريق: ${report.strengths.slice(0, 3).join("، ")}`);
    }
    if (Array.isArray(report.weaknesses) && report.weaknesses.length) {
      lines.push(`  · نقاط تحتاج تحسين: ${report.weaknesses.slice(0, 3).join("، ")}`);
    }
  } else {
    lines.push("- مفيش تقرير أداء منشور لهذا العميل لسه.");
  }

  return lines.join("\n");
}

function openRouterHeaders(apiKey) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    "HTTP-Referer": OPENROUTER_SITE_URL,
    "X-Title": OPENROUTER_SITE_NAME,
  };
}

// بيحدد هل الخطأ يستاهل نجرب الموديل اللي بعده في القائمة (Rate Limit /
// Quota / خطأ سيرفر مؤقت / Timeout) ولا لأ (مثلاً خطأ في شكل الطلب نفسه —
// ده هيفشل مع كل الموديلات فمفيش داعي نضيّع وقت نجربهم كلهم).
function isFailoverWorthyStatus(status) {
  // 429 = Rate limit / Quota exceeded
  // 408 = Request Timeout
  // 5xx = خطأ سيرفر مؤقت (بما فيها 502/503/504 اللي بتحصل مع OpenRouter وقت
  // ضغط أو لما الموديل نفسه يبقى مش متاح مؤقتًا)
  return status === 429 || status === 408 || (status >= 500 && status < 600);
}

// نداء بسيط (غير Streaming) لـ OpenRouter — بيستخدم لتوليد الملخص/الذاكرة
// بعد كل تبادل. بيجرب كل موديل في MODELS بالترتيب، ولو موديل فشل بسبب
// Rate Limit/خطأ سيرفر/Timeout بينتقل تلقائيًا للي بعده.
async function callOpenRouterOnce({ apiKey, systemText, messages, maxTokens }) {
  const fullMessages = [{ role: "system", content: systemText }, ...messages];

  for (const model of MODELS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PER_MODEL_TIMEOUT_MS);
    try {
      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: openRouterHeaders(apiKey),
        body: JSON.stringify({
          model,
          messages: fullMessages,
          max_tokens: maxTokens,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.error(`OpenRouter error (model=${model}):`, res.status, errText);
        if (isFailoverWorthyStatus(res.status)) continue; // جرب الموديل اللي بعده
        return null; // خطأ مش هيتحل بتغيير الموديل
      }

      const data = await res.json().catch(() => null);
      const text = data?.choices?.[0]?.message?.content || null;
      if (text) return text;
      // رد فاضي/غير متوقع — جرب الموديل اللي بعده بدل ما نرجّع فاضي
    } catch (err) {
      clearTimeout(timer);
      console.error(`OpenRouter request failed (model=${model}):`, err?.name || err);
      // Timeout (AbortError) أو خطأ شبكة — جرب الموديل اللي بعده
      continue;
    }
  }
  return null;
}

export async function POST(req) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "المساعد الذكي مش مفعّل لسه — لازم تضيف OPENROUTER_API_KEY في إعدادات السيرفر.",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // 1) التحقق من هوية العميل (لازم يكون مسجّل دخول)
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return new Response(
        JSON.stringify({ error: "لازم تسجّل الدخول الأول عشان تستخدم المساعد الذكي." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabaseService = getSupabaseService();
    const { data: userData, error: userError } = await supabaseService.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "جلسة الدخول غير صالحة، سجّل الدخول تاني." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    const clientId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const clientMessages = Array.isArray(body?.messages) ? body.messages : [];
    const lastUserMessage = [...clientMessages].reverse().find((m) => m?.role === "user");
    const userText = typeof lastUserMessage?.content === "string" ? lastUserMessage.content.trim() : "";

    if (!userText) {
      return new Response(JSON.stringify({ error: "من فضلك اكتب رسالة الأول." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2) هات المحادثة الحالية أو اعمل واحدة جديدة
    let conversationId = typeof body?.conversationId === "string" ? body.conversationId : null;

    if (conversationId) {
      const { data: existing } = await supabaseService
        .from("ai_chat_conversations")
        .select("id")
        .eq("id", conversationId)
        .eq("client_id", clientId)
        .maybeSingle();
      if (!existing) conversationId = null;
    }

    if (!conversationId) {
      const { data: created, error: createError } = await supabaseService
        .from("ai_chat_conversations")
        .insert({ client_id: clientId, last_message_preview: userText.slice(0, 200) })
        .select("id")
        .single();
      if (createError) throw createError;
      conversationId = created.id;
    }

    // 3) احفظ رسالة العميل (من غير أي قص للمحتوى)
    await supabaseService.from("ai_chat_messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: userText,
    });

    // 4) هات الرسائل من قاعدة البيانات (مش من الفرونت) عشان الهيستوري يبقى
    // موثوق ومتطابق مع اللي اتخزن فعلاً
    const { data: historyRows } = await supabaseService
      .from("ai_chat_messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    const chatMessages = buildChatMessages(historyRows || []);

    // 4.5) هات ملف العميل الحقيقي (بيانات + آخر تحليلات + اشتراك) وذاكرته
    // الدائمة المتراكمة من محادثات سابقة، وحقنهم في الـ system prompt —
    // ده اللي بيخلي المساعد "يفتكر" العميل ويحلل حسابه بأرقام حقيقية.
    const [clientProfileText, { data: memoryRow }] = await Promise.all([
      buildClientProfileText(supabaseService, clientId).catch((e) => {
        console.error("buildClientProfileText error:", e);
        return "- تعذّر تحميل بيانات الحساب حاليًا.";
      }),
      supabaseService.from("ai_client_memory").select("memory_text").eq("client_id", clientId).maybeSingle(),
    ]);

    const memoryText = memoryRow?.memory_text?.trim();

    const fullSystemPrompt =
      SYSTEM_PROMPT +
      `\n\n═══════════════════════════════════\nبيانات العميل الحالية (من حسابه الفعلي على الموقع)\n═══════════════════════════════════\n` +
      clientProfileText +
      (memoryText
        ? `\n\n═══════════════════════════════════\nحقائق سابقة عن العميل (من محادثات سابقة)\n═══════════════════════════════════\n${memoryText}`
        : "");

    const fullChatMessages = [{ role: "system", content: fullSystemPrompt }, ...chatMessages];

    // 🔁 نجرب الموديلات بالترتيب واحد ورا التاني (Automatic Failover). أول
    // ما موديل يرد بنجاح (upstream.ok) بنوقف ونكمل بيه. لو موديل فشل بسبب
    // Rate Limit/خطأ سيرفر/Timeout بننقل للي بعده تلقائيًا من غير ما العميل
    // يحس أو يضطر يطلب تاني.
    let upstream = null;
    let usedModel = null;
    let lastErrorStatus = null;
    let lastErrorDetail = "";

    for (const model of MODELS) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), PER_MODEL_TIMEOUT_MS);
      try {
        const res = await fetch(OPENROUTER_URL, {
          method: "POST",
          headers: openRouterHeaders(apiKey),
          body: JSON.stringify({
            model,
            messages: fullChatMessages,
            max_tokens: MAX_OUTPUT_TOKENS,
            stream: true,
          }),
          signal: controller.signal,
        });

        if (res.ok && res.body) {
          clearTimeout(timer);
          upstream = res;
          usedModel = model;
          break; // نجح — نوقف عن تجربة باقي الموديلات
        }

        clearTimeout(timer);
        const errText = await res.text().catch(() => "");
        console.error(`OpenRouter stream error (model=${model}):`, res.status, errText);
        lastErrorStatus = res.status;
        try {
          const parsed = JSON.parse(errText);
          lastErrorDetail = parsed?.error?.message || "";
        } catch {
          lastErrorDetail = errText?.slice(0, 200) || "";
        }
        if (!isFailoverWorthyStatus(res.status)) break; // خطأ مش هيتحل بتغيير الموديل
        // غير كده: كمل الحلقة وجرب الموديل اللي بعده
      } catch (err) {
        clearTimeout(timer);
        console.error(`OpenRouter stream request failed (model=${model}):`, err?.name || err);
        lastErrorStatus = err?.name === "AbortError" ? 408 : 502;
        lastErrorDetail = err?.name === "AbortError" ? "Request timed out" : String(err?.message || err);
        // Timeout أو خطأ شبكة — جرب الموديل اللي بعده
      }
    }

    if (!upstream || !upstream.body) {
      // بنحاول نطلع سبب حقيقي مختصر من رد آخر موديل جربناه (زي "API key
      // invalid" أو "rate limit exceeded") بدل رسالة عامة ملهاش لازمة — من
      // غير ما نسرّب أي جزء من المفتاح نفسه.
      return new Response(
        JSON.stringify({
          error: "حصل خطأ أثناء التواصل مع المساعد الذكي، جرب تاني كمان شوية.",
          debug: `All models failed. Last status ${lastErrorStatus}${lastErrorDetail ? `: ${lastErrorDetail}` : ""}`,
        }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let buffer = "";
    let fullReply = "";

    const stream = new ReadableStream({
      async start(controller) {
        const reader = upstream.body.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              const trimmedLine = line.trim();
              if (!trimmedLine.startsWith("data:")) continue;
              const jsonStr = trimmedLine.slice(5).trim();
              if (!jsonStr || jsonStr === "[DONE]") continue;

              try {
                const evt = JSON.parse(jsonStr);
                // صيغة OpenAI-compatible streaming اللي OpenRouter بيستخدمها:
                // كل chunk فيه choices[0].delta.content بيمثل جزء من النص.
                const text = evt?.choices?.[0]?.delta?.content;
                if (typeof text === "string" && text.length > 0) {
                  fullReply += text;
                  controller.enqueue(encoder.encode(text));
                }
              } catch {
                // تجاهل أي سطر مش JSON سليم
              }
            }
          }
        } catch (err) {
          console.error("Stream read error:", err);
        } finally {
          controller.close();

          // 5) بعد ما خلص الرد: احفظه + حدّث الملخص والذاكرة بنداء واحد مدموج
          // (بدل نداءين منفصلين) — توفير حقيقي في الكوتة المجانية.
          (async () => {
            try {
              if (fullReply.trim()) {
                await supabaseService.from("ai_chat_messages").insert({
                  conversation_id: conversationId,
                  role: "assistant",
                  content: fullReply,
                });
              }

              const { data: allRows } = await supabaseService
                .from("ai_chat_messages")
                .select("role, content")
                .eq("conversation_id", conversationId)
                .order("created_at", { ascending: true });

              // هات الذاكرة الحالية (لو موجودة) عشان تتحط في نفس النداء المدموج
              const { data: existingMemory } = await supabaseService
                .from("ai_client_memory")
                .select("memory_text")
                .eq("client_id", clientId)
                .maybeSingle();

              const combinedPromptParts = [
                "لخّص المحادثة اللي فوق دي وحدّث ذاكرة العميل حسب التعليمات.",
              ];
              if (existingMemory?.memory_text?.trim()) {
                combinedPromptParts.push(
                  `الذاكرة الحالية عن العميل:\n${existingMemory.memory_text.trim()}`
                );
              }

              const combinedMessages = buildChatMessages(allRows || []).concat([
                { role: "user", content: combinedPromptParts.join("\n\n---\n\n") },
              ]);

              const combinedRaw = await callOpenRouterOnce({
                apiKey,
                systemText: SUMMARY_AND_MEMORY_SYSTEM_PROMPT,
                messages: combinedMessages,
                maxTokens: 700,
              });

              const { summary, memory } = parseSummaryAndMemory(combinedRaw);

              await supabaseService
                .from("ai_chat_conversations")
                .update({
                  summary: summary || undefined,
                  last_message_preview: (fullReply || userText).slice(0, 200),
                  last_message_at: new Date().toISOString(),
                  messages_count: (allRows || []).length,
                })
                .eq("id", conversationId);

              if (memory) {
                try {
                  await supabaseService
                    .from("ai_client_memory")
                    .upsert({ client_id: clientId, memory_text: memory }, { onConflict: "client_id" });
                } catch (memErr) {
                  console.error("Memory update error:", memErr);
                }
              }
            } catch (bgErr) {
              console.error("Post-chat save/summary error:", bgErr);
            }
          })();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Conversation-Id": conversationId,
        // مفيد للتشخيص فقط — بيوضح أي موديل من الـ 3 فعليًا رد على الرسالة دي
        // (مثلاً لو الأساسي فشل وحصل تحويل تلقائي لاحتياطي).
        "X-Model-Used": usedModel || "",
      },
    });
  } catch (err) {
    console.error("Chat route error:", err);
    return new Response(JSON.stringify({ error: "حصل خطأ غير متوقع، جرب تاني." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
