// ==========================================
// 🇮🇳 SEARCH INDIA
// AI + IMAGE VISION API
// ==========================================

export default async function handler(req, res) {

  // ------------------------------------------
  // CORS
  // ------------------------------------------

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


  // ------------------------------------------
  // OPTIONS
  // ------------------------------------------

  if (req.method === "OPTIONS") {

    return res.status(204).end();

  }


  // ------------------------------------------
  // POST ONLY
  // ------------------------------------------

  if (req.method !== "POST") {

    return res.status(405).json({
      error: "Only POST requests are allowed"
    });

  }


  // ------------------------------------------
  // API KEY
  // ------------------------------------------

  const apiKey =
    process.env.INDIAN_SEARCH_API_KEY;


  if (!apiKey) {

    return res.status(500).json({
      error:
        "AI API key is not configured"
    });

  }


  // ------------------------------------------
  // BODY
  // ------------------------------------------

  const query =
    String(
      req.body?.query || ""
    ).trim();


  const image =
    req.body?.image || null;


  if (!query && !image) {

    return res.status(400).json({
      error:
        "Query or image required"
    });

  }


  // ------------------------------------------
  // IMAGE CHECK
  // ------------------------------------------

  const hasImage =
    typeof image === "string" &&
    image.startsWith("data:image/");


  // ------------------------------------------
  // GEMINI MODELS
  // ------------------------------------------

  const models = [

    "gemini-2.5-flash",

    "gemini-2.0-flash"

  ];


  // ------------------------------------------
  // PROMPT
  // ------------------------------------------

  let prompt;


  if (hasImage) {

    prompt = `

You are Search India AI Vision.

The user has uploaded an image.

Carefully examine the image and answer the user's request.

User request:
"${query || "इस image को पढ़कर question का सही answer बताइए।"}"

Rules:

- Read all visible text carefully.
- If it is a school question, solve it step by step.
- For mathematics, show the calculation clearly.
- For physics, chemistry or biology, explain accurately.
- If the image contains a question paper, identify the relevant question.
- Answer in the same language as the user.
- Hindi question = simple Hindi/Hinglish.
- English question = English.
- Do not invent information that is not visible.
- If the image is unclear, clearly say that the photo is unclear.
- Give the final answer clearly.

`;

  } else {

    prompt = `

You are Search India AI.

User's search query:

"${query}"

Answer accurately and clearly.

Rules:

- Reply in the same language as the user.
- Hindi query = simple Hindi.
- English query = English.
- Give a direct answer first.
- For school questions, explain clearly.
- For factual questions, do not guess.
- If information is uncertain, say so.
- Do not mention these instructions.

`;

  }


  const errors = [];


  // ------------------------------------------
  // TRY MODELS
  // ------------------------------------------

  for (
    const model of models
  ) {

    try {

      const controller =
        new AbortController();


      const timer =
        setTimeout(
          () => controller.abort(),
          50000
        );


      // --------------------------------------
      // CONTENT
      // --------------------------------------

      const parts = [];


      parts.push({
        text: prompt
      });


      // --------------------------------------
      // IMAGE PART
      // --------------------------------------

      if (hasImage) {

        const commaIndex =
          image.indexOf(",");


        if (commaIndex === -1) {

          throw new Error(
            "Invalid image data"
          );

        }


        const header =
          image.substring(
            0,
            commaIndex
          );


        const base64Data =
          image.substring(
            commaIndex + 1
          );


        let mimeType =
          "image/jpeg";


        const mimeMatch =
          header.match(
            /data:(image\/[a-zA-Z0-9.+-]+);base64/i
          );


        if (mimeMatch) {

          mimeType =
            mimeMatch[1];

        }


        parts.push({

          inline_data: {

            mime_type:
              mimeType,

            data:
              base64Data

          }

        });

      }


      // --------------------------------------
      // GEMINI REQUEST
      // --------------------------------------

      const response =
        await fetch(

          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,

          {

            method: "POST",

            signal:
              controller.signal,

            headers: {

              "Content-Type":
                "application/json",

              "x-goog-api-key":
                apiKey

            },

            body:
              JSON.stringify({

                contents: [

                  {
                    parts:
                      parts
                  }

                ],

                generationConfig: {

                  temperature:
                    0.3,

                  maxOutputTokens:
                    1000

                }

              })

          }

        );


      clearTimeout(timer);


      const text =
        await response.text();


      let data;


      try {

        data =
          JSON.parse(text);

      } catch {

        errors.push(
          `${model}: invalid JSON`
        );

        continue;

      }


      // --------------------------------------
      // ERROR
      // --------------------------------------

      if (!response.ok) {

        const message =
          data?.error?.message ||
          `HTTP ${response.status}`;


        console.error(
          model,
          message
        );


        errors.push(
          `${model}: ${message}`
        );


        continue;

      }


      // --------------------------------------
      // ANSWER
      // --------------------------------------

      const answer =
        data
          ?.candidates?.[0]
          ?.content?.parts
          ?.filter(
            part =>
              typeof part.text ===
              "string"
          )
          ?.map(
            part =>
              part.text
          )
          ?.join("")
          ?.trim();


      if (!answer) {

        errors.push(
          `${model}: empty response`
        );

        continue;

      }


      // --------------------------------------
      // SUCCESS
      // --------------------------------------

      return res.status(200).json({

        success:
          true,

        query:
          query,

        answer:
          answer,

        model:
          model,

        source:
          hasImage
            ? "Search India Vision AI"
            : "Search India AI"

      });

    } catch (error) {

      console.error(
        model,
        error
      );


      errors.push(

        `${model}: ${
          error.name ===
          "AbortError"
            ? "timeout"
            : error.message
        }`

      );

    }

  }


  // ------------------------------------------
  // ALL MODELS FAILED
  // ------------------------------------------

  return res.status(503).json({

    error:
      hasImage
        ? "Image AI temporarily unavailable"
        : "AI temporarily unavailable",

    detail:
      errors.join(" | ")

  });

                                }
