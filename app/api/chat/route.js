// app/api/chat/route.js
//
// نقطة الاتصال الوحيدة بين شات الموقع وذكاء Gemini من Google.
// كل الاتصال بيحصل من السيرفر عشان الـ API Key يفضل مخفي تمامًا عن المتصفح.
//
// المتغير المطلوب في .env.local (وفي إعدادات Vercel):
//   GEMINI_API_KEY=AIzaxxxxxxxx
//
// الموديل: gemini-flash-latest — سريع، رخيص، وبيدعم Google Search grounding
// (يقدر "يبحث" فعليًا على الإنترنت قبل ما يرد، مش بس يعتمد على معرفته
// المحفوظة وقت التدريب) — ده بيخليه يجيب استراتيجيات وأساليب حقيقية ومحدّثة
// من كبار المسوقين العالميين (Gary Vaynerchuk, Neil Patel, Alex Hormozi,
// Seth Godin...) بدل ما يخمّن من الذاكرة بس.
//
// ⚠️ الشات ده لازم العميل يكون مسجّل دخول (شوف MarketingChatWidget.jsx):
// كل رسالة بتتحفظ في جدول ai_chat_messages مربوطة بمحادثة
// (ai_chat_conversations) مربوطة بحساب العميل، عشان تظهر لاحقًا في لوحة
// الأدمن تحت "محادثات الذكاء الاصطناعي".

import { getSupabaseService } from "../../../lib/supabaseServiceClient";

export const runtime = "nodejs";
// أقصى مدة تنفيذ للـ route ده على Vercel (اتضبط كمان في vercel.json).
// ردود طويلة + بحث جوجل ممكن ياخدوا وقت أطول من الـ default (10 ثانية)،
// فبنديله مساحة كافية عشان ميتقطعش/يعلّق في نص الرد.
export const maxDuration = 60;

const MODEL = "gemini-flash-latest";

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

استخدم أدوات البحث المتاحة لك (Google Search) لما تحتاج تتأكد من معلومة حديثة، إحصائية، اتجاه
سوق، أو تفصيلة عن أسلوب مسوّق معين — بدل ما تعتمد على الذاكرة بس. ده مهم جدًا في حالتين:
1) لما العميل يسأل عن اتجاه أو منصة أو خوارزمية حديثة ممكن تكون اتغيرت.
2) لما تستشهد بأسلوب مسوّق مشهور معين — تأكد إن اللي بتقوله عنه دقيق فعلاً.

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
أسلوب الردود — الطول والعمق
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

// System prompt منفصل ومختصر لتوليد ملخص المحادثة (نداء تاني منفصل، مش هيتقال للعميل)
const SUMMARY_SYSTEM_PROMPT = `مهمتك الوحيدة: تلخيص محادثة بين عميل وشات ذكاء اصطناعي تسويقي اسمه
"خبير عبدالله ماركتنج"، عشان صاحب الوكالة (عبدالله) يقدر ياخد فكرة سريعة عن المحادثة من غير
ما يقرأها كاملة.

اكتب ملخص من 2-4 جمل بالعربي (مصري بسيط)، يغطي:
- إيه اللي كان العميل محتاجه أو بيسأل عنه فعليًا (نوع البيزنس لو اتقال، المشكلة أو الهدف).
- أهم حاجة اتقالت له أو اتقترحت عليه.
- لو العميل مهتم بخدمة معينة أو مستني يتواصل مع عبدالله، اذكر ده صراحة في آخر الملخص.

ما تكتبش أي مقدمة زي "الملخص:" أو "في المحادثة دي"، ابدأ بالمحتوى على طول. من غير نقط أو
عناوين — فقرة نصية عادية بس.`;

function buildGeminiContents(rows) {
  return rows
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      // مفيش قص للمحتوى هنا (كان .slice(0,6000) قبل كده) — العميل يقدر يبعت
      // ويستقبل رسائل طويلة عادي من غير بتر مفاجئ للسياق.
      parts: [{ text: m.content }],
    }));
}

// نداء بسيط (غير Streaming) لـ Gemini — بيستخدم لتوليد الملخص بعد كل تبادل
async function callGeminiOnce({ apiKey, systemText, contents, maxTokens }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents,
      systemInstruction: { parts: [{ text: systemText }] },
      generationConfig: { maxOutputTokens: maxTokens },
    }),
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
}

export async function POST(req) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "المساعد الذكي مش مفعّل لسه — لازم تضيف GEMINI_API_KEY في إعدادات السيرفر.",
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

    const contents = buildGeminiContents(historyRows || []);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent?alt=sse`;
    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        // بيسمح للموديل يستخدم بحث جوجل الفعلي قبل ما يرد — ده اللي بيخليه
        // "يبحث" عن أحدث أساليب/استراتيجيات كبار المسوقين بدل ما يعتمد على
        // معرفته المحفوظة بس.
        tools: [{ google_search: {} }],
        generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS },
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const errText = await upstream.text().catch(() => "");
      console.error("Gemini API error:", upstream.status, errText);
      return new Response(
        JSON.stringify({ error: "حصل خطأ أثناء التواصل مع المساعد الذكي، جرب تاني كمان شوية." }),
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
                // ملاحظة: لما google_search مفعّل، أول أجزاء الاستجابة ممكن
                // تكون بيانات groundingMetadata من غير نص فعلي — بنتجاهلها
                // ونستنى الجزء اللي فيه نص حقيقي.
                const text = evt?.candidates?.[0]?.content?.parts
                  ?.map((p) => p?.text || "")
                  .join("");
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

          // 5) بعد ما خلص الرد: احفظه + حدّث الملخص — من غير ما نستنى ده
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

              const summaryContents = buildGeminiContents(allRows || []).concat([
                {
                  role: "user",
                  parts: [{ text: "لخّص المحادثة اللي فوق دي حسب التعليمات." }],
                },
              ]);

              const summary = await callGeminiOnce({
                apiKey,
                systemText: SUMMARY_SYSTEM_PROMPT,
                contents: summaryContents,
                maxTokens: 300,
              });

              await supabaseService
                .from("ai_chat_conversations")
                .update({
                  summary: summary?.trim() || undefined,
                  last_message_preview: (fullReply || userText).slice(0, 200),
                  last_message_at: new Date().toISOString(),
                  messages_count: (allRows || []).length,
                })
                .eq("id", conversationId);
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
