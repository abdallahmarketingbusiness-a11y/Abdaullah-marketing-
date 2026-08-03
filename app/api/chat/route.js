// app/api/chat/route.js
//
// نقطة الاتصال الوحيدة بين شات الموقع وذكاء Gemini من Google.
// كل الاتصال بيحصل من السيرفر عشان الـ API Key يفضل مخفي تمامًا عن المتصفح
// (لو حطيناه في كود الفرونت هيبان لأي حد بيفتح Developer Tools).
//
// المتغير المطلوب في .env.local (وفي إعدادات Vercel):
//   GEMINI_API_KEY=AIzaxxxxxxxx
//
// الموديل المستخدم: gemini-flash-latest — سريع ورخيص ومناسب لمحادثات
// تسويقية. لو حبيت موديل تاني غيّر قيمة MODEL تحت (مثلاً gemini-pro-latest).
//
// ⚠️ الشات ده بقى لازم العميل يكون مسجّل دخول (شوف MarketingChatWidget.jsx):
// كل رسالة بتتحفظ في جدول ai_chat_messages مربوطة بمحادثة (ai_chat_conversations)
// مربوطة بحساب العميل، عشان تظهر لاحقًا في لوحة الأدمن تحت "محادثات الذكاء
// الاصطناعي" (عميل → محادثاته → ملخص + عرض كامل).

import { getSupabaseService } from "../../../lib/supabaseServiceClient";

export const runtime = "nodejs";

const MODEL = "gemini-flash-latest";
const MAX_TOKENS = 1024;

// أقصى عدد رسائل هنبعتها للموديل من الهيستوري (عشان نتحكم في التكلفة
// ومنبعتش محادثة لا نهائية في كل طلب).
const MAX_HISTORY_MESSAGES = 16;

const SYSTEM_PROMPT = `أنتَ "خبير عبدالله ماركتنج" — مساعد ذكاء اصطناعي متخصص بشكل عميق جدًا في التسويق الرقمي
والتسويق عبر السوشيال ميديا، مدمج داخل موقع "Abdullah Marketing" (وكالة تسويق رقمي مصرية
يديرها عبدالله، متخصصة في السوشيال ميديا، الهوية البصرية، الريلز، إعلانات ميتا، ومواقع/مينيوهات
المطاعم الرقمية).

هويتك ودورك:
- إنت خبير تسويق حقيقي بخبرة استراتيجية عميقة: تسويق سوشيال ميديا (Instagram, Facebook, TikTok,
  Snapchat)، إعلانات ممولة (Meta Ads / Google Ads)، بناء الهوية البصرية والبراند، صناعة المحتوى
  والريلز، تسويق المطاعم والكافيهات تحديدًا (منيوهات رقمية، هندسة المنيو، حملات الجوع البصري)،
  استراتيجيات النمو، تحليل الجمهور المستهدف، الـ copywriting الإعلاني، وتخطيط الحملات من الصفر
  للنتيجة.
- ردودك لازم تكون على مستوى استشاري حقيقي: محددة، عملية، بخطوات قابلة للتنفيذ فعليًا — مش كلام
  عام أو نظري. لو حد سألك عن حملة أو مشكلة تسويقية، اديله تحليل + خطة عملية، مش مجرد تعريف.
- استخدم أمثلة واقعية ومصرية/عربية قدر الإمكان (خصوصًا لو الكلام عن مطاعم أو سوق مصري)، وقدر
  الأرقام والنسب لما يكون مفيد (نسب مشاهدة، أوقات نشر، ميزانيات تقريبية) مع توضيح إنها تقديرية.

أسلوب الكلام:
- اتكلم باللهجة المصرية العامية بشكل افتراضي (زي ما بيتكلم عبدالله بالظبط) إلا لو حد كتب
  بالإنجليزي أو طلب منك صراحة تتكلم بلغة/لهجة تانية — في الحالة دي جاوب بنفس اللغة اللي بيتكلم
  بيها.
- كن ودود، واثق، ومباشر، بدون حشو أو مجاملة زايدة. ما تكررش نفس الكلام. رد مختصر ومركز أحسن من
  رد طويل فاضي، لكن لو الموضوع محتاج تفصيل (خطة حملة، استراتيجية كاملة) خد وقتك واشرح بخطوات
  واضحة (نقط أو أرقام).
- متستخدمش لغة إنجليزية أكاديمية جافة ولا تترجم حرفي من الإنجليزي — اكتب زي مصري بيفهم في
  الشغل بيتكلم مع عميل أو صاحبه.

حدود ومسؤوليات:
- إنت مش عبدالله نفسه ومتقولش إنك هو — إنت "المساعد الذكي" التابع لموقعه، بتقدر تقول ده لو حد
  سأل مين إنت.
- لو حد محتاج خدمة فعلية (تصميم، إدارة سوشيال ميديا، موقع مطعم، حملة إعلانية) وسألك تسعير دقيق
  أو حجز، وضّح إن التفاصيل والأسعار الدقيقة بتتحدد حسب المشروع، وادّيله نصيحة سريعة عن الخطوة
  الجاية، واقترح عليه بشكل طبيعي (مش إلحاح مبالغ فيه) إنه يتواصل مباشرة عبر واتساب مع عبدالله
  عشان يتفق على التفاصيل ("تقدر تتواصل مباشرة عبر زرار الواتساب في الموقع").
- ما تديش نصائح تقنية أو أدوات لأشياء غير أخلاقية (حسابات وهمية، بوتات فيوز مزيفة، سبام،
  اختراق حسابات منافسين، محتوى مضلل). لو حد طلب كده، ارفض بلطف واقترح بديل أخلاقي وفعّال.
- ركّز في إجاباتك على التسويق والمجالات المرتبطة بيه (بيزنس، براند، محتوى، إعلانات). لو حد
  سأل عن حاجة برة الموضوع تمامًا، جاوب بإيجاز واقترح يرجع لموضوع التسويق لو حابب.

هدفك النهائي: إن أي زائر للموقع يحس إنه بيكلم أذكى وأقوى استشاري تسويق ممكن يوصله، وإن التجربة
دي نفسها تعكس جودة واحترافية "Abdullah Marketing".`;

// System prompt منفصل ومختصر لتوليد ملخص المحادثة (مش هيتقال للعميل، ده
// نداء تاني منفصل بيروح لنفس Gemini بعد ما يخلص رد المساعد على العميل).
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
      parts: [{ text: m.content.slice(0, 6000) }],
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

    // 2) هات المحادثة الحالية أو اعمل واحدة جديدة (conversationId اختياري
    // جاي من الفرونت عشان نفرّق بين "افتح شات جديد" و"استكمال نفس الشات")
    let conversationId = typeof body?.conversationId === "string" ? body.conversationId : null;

    if (conversationId) {
      const { data: existing } = await supabaseService
        .from("ai_chat_conversations")
        .select("id")
        .eq("id", conversationId)
        .eq("client_id", clientId)
        .maybeSingle();
      if (!existing) conversationId = null; // مش لقيها أو مش بتاعته → هنعمل واحدة جديدة
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

    // 3) احفظ رسالة العميل
    await supabaseService.from("ai_chat_messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: userText.slice(0, 6000),
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
        generationConfig: { maxOutputTokens: MAX_TOKENS },
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
                const text = evt?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (typeof text === "string" && text.length > 0) {
                  fullReply += text;
                  // أول جزء من الـ stream بنبعت معاه سطر خفي فيه الـ conversationId
                  // عشان الفرونت يعرف يبعته في الرسالة الجاية (نفس المحادثة)
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
          // (best-effort، لو فشل مش هيأثر على تجربة العميل)
          (async () => {
            try {
              if (fullReply.trim()) {
                await supabaseService.from("ai_chat_messages").insert({
                  conversation_id: conversationId,
                  role: "assistant",
                  content: fullReply.slice(0, 6000),
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
                maxTokens: 200,
              });

              await supabaseService
                .from("ai_chat_conversations")
                .update({
                  summary: summary?.trim() || undefined,
                  last_message_preview: fullReply.slice(0, 200) || userText.slice(0, 200),
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
