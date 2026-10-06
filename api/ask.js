// ========================================
// SEARCH INDIA - AI API
// Google Gemini API
// ========================================

export default async function handler(req, res) {

  // ----------------------------------------
  // CORS
  // ----------------------------------------

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "POST, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  // ----------------------------------------
  // OPTIONS
  // ----------------------------------------

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // ----------------------------------------
  // ONLY POST
  // ----------------------------------------

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "POST method required"
    });
  }

  // ----------------------------------------
  // API KEY
  // ----------------------------------------

  const apiKey =
    process.env.SEARCH_INDIA_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error:
        "SEARCH_INDIA_API_KEY is missing in Vercel"
    });
  }

  try {

    // ----------------------------------------
    // GET USER QUESTION
    // ----------------------------------------

    const query =
      String(req.body?.query || "").trim();

    if (!query) {
      return res.status(400).json({
        error: "Question is required"
      });
    }

    // ----------------------------------------
    // GEMINI API
    // ----------------------------------------

    const model = "gemini-3.8-flash";

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const response = await fetch(url, {
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
If the user asks in Hindi, answer in Hindi.
If the user asks in English, answer in English.

Do not make up facts.
If you are unsure, clearly say that you are unsure.

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
    // READ RESPONSE
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
        "Gemini error:",
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
    // GET ANSWER
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
        error:
          "Gemini returned no answer"
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
      error:
        "AI backend failed",

      detail:
        error?.message ||
        "Unknown error"
    });
  }
    }
