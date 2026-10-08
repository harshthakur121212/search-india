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

  // Fast model first
  const models = [
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-3.8-flash"
  ];

  let imagePart = null;

  // Image support
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

Image को ध्यान से पढ़कर user के सवाल का सही उत्तर दें।

अगर यह पढ़ाई का सवाल है:
- पहले सही answer दें
- फिर short explanation दें
- जरूरत होने पर steps दिखाएं
- Class 11/12 या NEET level हो तो exam-oriented रखें

User Question:
${query || "इस image में दिए गए सवाल का उत्तर बताइए।"}

भाषा: सरल Hindi/Hinglish
`
    : `
आप Search India AI हैं।

User के सवाल का सीधा और सही उत्तर दें।

Rules:
- Hindi/Hinglish में जवाब दें।
- पहले direct answer दें।
- जरूरत होने पर छोटा explanation दें।
- पढ़ाई के सवाल में आसान तरीके से समझाएं।
- अनावश्यक लंबा जवाब न दें।

Question:
${query}
`;

  for (const model of models) {
    try {
      const parts = [
        {
          text: prompt
        }
      ];

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
                parts
              }
            ],
            generationConfig: {
              maxOutputTokens: 700
            }
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error(
          `Gemini ${model}:`,
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
        continue;
      }

      return res.status(200).json({
        success: true,
        answer,
        model,
        source: "Google Gemini"
      });

    } catch (error) {
      console.error(
        `Gemini ${model} failed:`,
        error?.message || error
      );
    }
  }

  return res.status(503).json({
    success: false,
    error: "AI service temporarily unavailable"
  });
}
