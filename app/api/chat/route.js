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

function buildGeminiContents(clientMessages) {
  // بنقبل بس role: user/assistant ومحتوى نصي، وبنقص أي حاجة زيادة أو غريبة.
  const trimmed = Array.isArray(clientMessages)
    ? clientMessages.slice(-MAX_HISTORY_MESSAGES)
    : [];

  return trimmed
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0
    )
    .map((m) => ({
      // Gemini بيستخدم "model" بدل "assistant"
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content.slice(0, 6000) }], // حماية بسيطة من رسائل ضخمة جدًا
    }));
}

export async function POST(req) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error:
            "المساعد الذكي مش مفعّل لسه — لازم تضيف GEMINI_API_KEY في إعدادات السيرفر.",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const contents = buildGeminiContents(body?.messages);

    if (contents.length === 0) {
      return new Response(
        JSON.stringify({ error: "من فضلك اكتب رسالة الأول." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent?alt=sse`;

    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        generationConfig: {
          maxOutputTokens: MAX_TOKENS,
        },
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const errText = await upstream.text().catch(() => "");
      console.error("Gemini API error:", upstream.status, errText);
      return new Response(
        JSON.stringify({
          error: "حصل خطأ أثناء التواصل مع المساعد الذكي، جرب تاني كمان شوية.",
        }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    // بنحوّل الـ SSE الأصلي من Gemini لتيار نصي بسيط (plain text chunks)
    // عشان الفرونت يقدر يعرضه تدريجيًا من غير ما يحتاج يفهم فورمات SSE.
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let buffer = "";

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
                const text =
                  evt?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (typeof text === "string" && text.length > 0) {
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
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    console.error("Chat route error:", err);
    return new Response(
      JSON.stringify({ error: "حصل خطأ غير متوقع، جرب تاني." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
