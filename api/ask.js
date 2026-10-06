// ========================================
// SEARCH INDIA 🇮🇳
// AI BACKEND - GEMINI FALLBACK SYSTEM
// ========================================

export default async function handler(req, res) {

  // ======================================
  // CORS
  // ======================================

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


  // ======================================
  // OPTIONS
  // ======================================

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }


  // ======================================
  // ONLY POST
  // ======================================

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "POST method required"
    });
  }


  // ======================================
  // API KEY
  // ======================================

  const apiKey =
    process.env.INDIAN_SEARCH_API_KEY;


  if (!apiKey) {
    return res.status(500).json({
      error:
        "INDIAN_SEARCH_API_KEY is missing in Vercel"
    });
  }


  try {

    // ====================================
    // USER QUESTION
    // ====================================

    const query =
      String(req.body?.query || "").trim();


    if (!query) {
      return res.status(400).json({
        error: "Question is required"
      });
    }


    // ====================================
    // GEMINI FALLBACK MODELS
    // ====================================

    const models = [
      "gemini-3.8-flash",
      "gemini-3.5-flash",
      "gemini-3.5-flash-lite"
    ];


    let lastError = null;


    // ====================================
    // TRY MODELS ONE BY ONE
    // ====================================

    for (const model of models) {

      try {

        console.log(
          "Trying Gemini model:",
          model
        );


        const apiUrl =
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;


        // ==================================
        // GEMINI REQUEST
        // ==================================

        const response = await fetch(
          apiUrl,
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

                  parts: [
                    {
                      text:
`You are Search India AI.

Answer the user's question accurately,
clearly and helpfully.

Reply in the same language as the user.

If the user asks in Hindi,
answer in Hindi.

If the user asks in English,
answer in English.

Do not invent facts.
If you are unsure, clearly say so.

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
          }
        );


        // ==================================
        // READ RESPONSE
        // ==================================

        const text =
          await response.text();


        let data = {};

        try {

          data =
            text
              ? JSON.parse(text)
              : {};

        } catch {

          data = {
            error: {
              message:
                "Gemini returned invalid response"
            }
          };

        }


        console.log(
          "Gemini model:",
          model
        );

        console.log(
          "Gemini status:",
          response.status
        );


        // ==================================
        // SUCCESS
        // ==================================

        if (response.ok) {

          const answer =
            data
              ?.candidates?.[0]
              ?.content?.parts
              ?.map(
                part =>
                  part?.text || ""
              )
              .join("")
              .trim();


          if (answer) {

            console.log(
              "Gemini success:",
              model
            );


            return res.status(200).json({

              success: true,

              query: query,

              answer: answer,

              model: model,

              source:
                "Search India AI"

            });

          }


          // No answer from this model
          lastError = {
            status: 502,
            message:
              "Gemini returned no answer"
          };

          continue;
        }


        // ==================================
        // ERROR INFORMATION
        // ==================================

        const errorMessage =
          data
            ?.error
            ?.message ||
          "Gemini API request failed";


        console.error(
          `Gemini ${model} error:`,
          response.status,
          errorMessage
        );


        lastError = {
          status: response.status,
          message: errorMessage
        };


        // ==================================
        // RETRYABLE ERRORS
        // ==================================

        const retryableStatuses = [
          429, // Too many requests
          500, // Server error
          502, // Bad gateway
          503, // Service unavailable
          504, // Timeout
          404  // Model unavailable
        ];


        if (
          retryableStatuses.includes(
            response.status
          )
        ) {

          console.log(
            "Trying next fallback model..."
          );

          continue;
        }


        // ==================================
        // NON-RETRYABLE ERROR
        // ==================================

        return res.status(502).json({

          error:
            "Gemini API failed",

          detail:
            errorMessage,

          model:
            model

        });

      } catch (modelError) {

        console.error(
          `Model ${model} request error:`,
          modelError
        );


        lastError = {
          status: 500,
          message:
            modelError?.message ||
            "Model request failed"
        };


        // Try next model
        continue;
      }
    }


    // ======================================
    // ALL MODELS FAILED
    // ======================================

    return res.status(503).json({

      error:
        "All Gemini AI models are currently unavailable.",

      detail:
        lastError?.message ||
        "Please try again later.",

      triedModels:
        models

    });


  } catch (error) {

    // ======================================
    // GENERAL BACKEND ERROR
    // ======================================

    console.error(
      "Search India AI backend error:",
      error
    );


    return res.status(500).json({

      error:
        "AI backend failed",

      detail:
        error?.message ||
        "Unknown server error"

    });

  }
      }
