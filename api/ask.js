// ========================================
// SEARCH INDIA - AI API
// Google Gemini API
// ========================================

export default async function handler(req, res) {

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "POST, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  // OPTIONS request
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // Only POST allowed
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "POST method required"
    });
  }

  // ----------------------------------------
  // VERCEL ENVIRONMENT VARIABLE
  // ----------------------------------------

  const apiKey =
    process.env.INDIAN_SEARCH_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "INDIAN_SEARCH_API_KEY is missing in Vercel"
    });
  }

  try {

    // ----------------------------------------
    // USER QUESTION
    // ----------------------------------------

    const query =
      String(req.body?.query || "").trim();

    if (!query) {
      return res.status(400).json({
        error: "Question is required"
      });
    }

    // ----------------------------------------
    // GEMINI MODEL
    // ----------------------------------------

    const model = "gemini-3.8-flash";

    const apiUrl =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    // ----------------------------------------
    // GEMINI REQUEST
    // ----------------------------------------

    const response = await fetch(apiUrl, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },

      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text:
`You are Search India AI.

Answer the user's question accurately,
clearly and helpfully.

Use the same language as the user.

If the user asks in Hindi,
answer in Hindi.

If the user asks in English,
answer in English.

Do not invent facts.
If you are unsure, say so clearly.

User question:
${query.slice(0, 4000)}`
              }
            ]
          }
        ],

        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1000
        }
      })
    });

    // ----------------------------------------
    // READ GEMINI RESPONSE
    // ----------------------------------------

    const data = await response.json();

    console.log(
      "Gemini status:",
      response.status
    );

    // ----------------------------------------
    // GEMINI ERROR
    // ----------------------------------------

    if (!response.ok) {

      console.error(
        "Gemini API error:",
        JSON.stringify(data)
      );

      return res.status(502).json({
        error: "Gemini API failed",
        detail:
          data?.error?.message ||
          "Gemini request failed"
      });
    }

    // ----------------------------------------
    // GET AI ANSWER
    // ----------------------------------------

    const answer =
      data?.candidates?.[0]?.content?.parts
        ?.map(part => part?.text || "")
        .join("")
        .trim();

    // ----------------------------------------
    // NO ANSWER
    // ----------------------------------------

    if (!answer) {

      console.error(
        "Gemini returned no answer:",
        JSON.stringify(data)
      );

      return res.status(502).json({
        error: "Gemini returned no answer"
      });
    }

    // ----------------------------------------
    // SUCCESS
    // ----------------------------------------

    return res.status(200).json({
      success: true,
      query: query,
      answer: answer,
      source: "Google Gemini"
    });

  } catch (error) {

    console.error(
      "Search India AI backend error:",
      error
    );

    return res.status(500).json({
      error: "AI backend failed",
      detail: error?.message || "Unknown error"
    });
  }
}
