// ==========================================
// 🇮🇳 SEARCH INDIA AI
// GEMINI AI BACKEND
// ==========================================

export default async function handler(req, res) {

  res.setHeader(
    "Access-Control-Allow-Origin",
    "*"
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "POST, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );


  if (req.method === "OPTIONS") {

    return res.status(204).end();

  }


  if (req.method !== "POST") {

    return res.status(405).json({
      error: "Only POST requests are allowed"
    });

  }


  const apiKey =
    process.env.INDIAN_SEARCH_API_KEY;


  if (!apiKey) {

    console.error(
      "INDIAN_SEARCH_API_KEY missing"
    );

    return res.status(500).json({
      error:
        "AI API key is not configured"
    });

  }


  const query =
    String(
      req.body?.query || ""
    ).trim();


  const image =
    req.body?.image || null;


  if (!query && !image) {

    return res.status(400).json({
      error:
        "Query or image is required"
    });

  }


  /*
   * New model first.
   * Fallback models are kept so that
   * one unavailable model does not break AI.
   */

  const models = [

    "gemini-3.8-flash",

    "gemini-2.5-flash-lite",

    "gemini-2.5-flash"

  ];


  let inlineImage = null;


  /*
   * IMAGE
   */

  if (
    image &&
    typeof image === "string" &&
    image.startsWith("data:image/")
  ) {

    const match =
      image.match(
        /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/
      );


    if (match) {

      inlineImage = {

        mime_type:
          match[1],

        data:
          match[2]

      };

    }

  }


  /*
   * PROMPT
   */

  let prompt;


  if (inlineImage) {

    prompt = `
आप Search India के AI assistant हैं।

इस image को ध्यान से पढ़ें।

अगर image में कोई question है:
1. Question को समझें।
2. सही answer दें।
3. जरूरत हो तो step-by-step explanation दें।
4. अगर यह school/board/NEET का सवाल है तो सरल भाषा में समझाएं।
5. बिना जरूरत बहुत लंबा answer न दें।

User का अतिरिक्त सवाल:

${query || "इस photo में दिए गए question का सही answer बताइए।"}

उत्तर Hindi/Hinglish में दें।
`;

  } else {

    prompt = `
आप "Search India AI" हैं।

User के सवाल का सही, स्पष्ट और उपयोगी उत्तर दें।

Rules:
- Hindi/Hinglish में सरल भाषा इस्तेमाल करें।
- जरूरत हो तो English terms भी रखें।
- Facts को स्पष्ट रखें।
- अगर सवाल पढ़ाई से संबंधित है तो example देकर समझाएं।
- सीधे answer से शुरू करें।
- बेवजह लंबा जवाब न दें।

User Question:
${query}
`;

  }


  /*
   * TRY MODELS
   */

  let lastError = null;


  for (
    const model of models
  ) {

    try {

      const controller =
        new AbortController();


      const timeout =
        setTimeout(
          () => controller.abort(),
          45000
        );


      const parts = [

        {
          text: prompt
        }

      ];


      if (inlineImage) {

        parts.push({

          inline_data:
            inlineImage

        });

      }


      const response =
        await fetch(

          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,

          {

            method: "POST",

            headers: {

              "Content-Type":
                "application/json",

              "x-goog-api-key":
                apiKey

            },

            body: JSON.stringify({

              contents: [

                {
                  role: "user",
                  parts: parts
                }

              ],

              generationConfig: {

                temperature: 0.3,

                maxOutputTokens: 1200

              }

            }),

            signal:
              controller.signal

          }

        );


      clearTimeout(timeout);


      const text =
        await response.text();


      let data;


      try {

        data =
          JSON.parse(text);

      } catch {

        throw new Error(
          "Invalid Gemini response"
        );

      }


      if (!response.ok) {

        console.error(
          `Gemini ${model} error:`,
          response.status,
          data
        );

        throw new Error(
          data?.error?.message ||
          `Gemini API error ${response.status}`
        );

      }


      const answer =
        data
          ?.candidates?.[0]
          ?.content?.parts
          ?.map(
            part => part?.text || ""
          )
          .join("")
          .trim();


      if (!answer) {

        throw new Error(
          "Gemini returned empty answer"
        );

      }


      return res.status(200).json({

        success: true,

        answer: answer,

        model: model,

        source: "Google Gemini"

      });


    } catch (error) {

      lastError = error;

      console.error(
        `Model ${model} failed:`,
        error
      );

    }

  }


  /*
   * ALL MODELS FAILED
   */

  return res.status(503).json({

    success: false,

    error:
      "AI service temporarily unavailable",

    detail:
      lastError?.message ||
      "All Gemini models failed"

  });

}
