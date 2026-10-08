export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Only POST requests are allowed"
    });
  }

  const apiKey = process.env.INDIAN_SEARCH_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "INDIAN_SEARCH_API_KEY is not configured"
    });
  }

  const query = String(req.body?.query || "").trim();
  const image = req.body?.image || null;

  if (!query && !image) {
    return res.status(400).json({
      error: "Query or image is required"
    });
  }

  // New Gemini models
  // 3.8 first, then reliable fallbacks
  const models = [
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite"
  ];

  let imagePart = null;

  if (
    image &&
    typeof image === "string" &&
    image.startsWith("data:image/")
  ) {
    const match = image.match(
      /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/
    );

    if (match) {
      imagePart = {
        inline_data: {
          mime_type: match[1],
          data: match[2]
        }
      };
    }
  }

  const prompt = imagePart
    ? `
आप Search India AI हैं।

इस image को ध्यान से पढ़ें और user के सवाल का सही उत्तर दें।

अगर image में पढ़ाई का सवाल है:
- सवाल समझें
- सही answer दें
- जरूरत होने पर step-by-step explanation दें
- Class 11/12 या NEET का सवाल हो तो exam-oriented answer दें

User का सवाल:
${query || "इस image में दिए गए सवाल का उत्तर बताइए।"}

उत्तर सरल Hindi/Hinglish में दें।
`
    : `
आप Search India AI हैं।

User के सवाल का सही और स्पष्ट उत्तर दें।

Rules:
- Hindi/Hinglish में जवाब दें।
- सीधे answer से शुरू करें।
- जरूरत हो तो example दें।
- पढ़ाई के सवाल में आसान explanation दें।
- बेवजह बहुत लंबा जवाब न दें।

User Question:
${query}
`;

  for (const model of models) {
    try {
      const parts = [{ text: prompt }];

      if (imagePart) {
        parts.push(imagePart);
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: parts
              }
            ],
            generationConfig: {
              maxOutputTokens: 1200
            }
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error(
          `Gemini ${model} error:`,
          response.status,
          data
        );

        continue;
      }

      const answer =
        data?.candidates?.[0]?.content?.parts
          ?.map(part => part?.text || "")
          .join("")
          .trim();

      if (!answer) {
        console.error(
          `Gemini ${model}: empty response`
        );
        continue;
      }

      return res.status(200).json({
        success: true,
        answer: answer,
        model: model,
        source: "Google Gemini"
      });

    } catch (error) {
      console.error(
        `Model ${model} failed:`,
        error
      );
    }
  }

  return res.status(503).json({
    success: false,
    error: "All Gemini models are temporarily unavailable"
  });
          }
