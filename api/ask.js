const GEMINI_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite"
];

const GEMINI_API_KEY = process.env.INDIAN_SEARCH_API_KEY;
const GROQ_API_KEY = process.env.SEARCH_HARSH_API_KEY;

async function requestGemini(model, parts) {
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    model +
    ":generateContent";

  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": GEMINI_API_KEY
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1200
      }
    })
  });
}

async function requestGroq(question) {
  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + GROQ_API_KEY
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content:
              "You are Search India AI. Answer accurately and clearly. " +
              "Reply in the user's language, including Hindi or Hinglish. " +
              "Do not invent facts. State uncertainty when needed."
          },
          { role: "user", content: question }
        ],
        temperature: 0.4,
        max_tokens: 1200
      })
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error("Groq API error:", {
      status: response.status,
      message: data?.error?.message || "Unknown Groq error"
    });
    return null;
  }

  const answer =
    data?.choices?.[0]?.message?.content?.trim();

  if (!answer) return null;

  return {
    answer,
    model: data?.model || "llama-3.3-70b-versatile"
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "Only POST requests are allowed."
    });
  }

  if (!GEMINI_API_KEY && !GROQ_API_KEY) {
    return res.status(500).json({
      error: "AI API key missing. Check Vercel Environment Variables."
    });
  }

  try {
    const body = req.body || {};

    let question = String(
      body.question || body.query || body.prompt || ""
    ).trim();

    const image =
      typeof body.image === "string" ? body.image : "";

    if (!question && image) {
      question =
        "Describe this image and answer helpfully in Hindi.";
    }

    if (!question) {
      return res.status(400).json({
        error: "Please enter a question."
      });
    }

    let timezone = "Asia/Kolkata";
    const requestedTimezone = body.timeZone || body.timezone;

    if (typeof requestedTimezone === "string") {
      try {
        new Intl.DateTimeFormat("en-IN", {
          timeZone: requestedTimezone
        });
        timezone = requestedTimezone;
      } catch {
        timezone = "Asia/Kolkata";
      }
    }

    const currentDateTime = new Intl.DateTimeFormat("en-IN", {
      timeZone: timezone,
      dateStyle: "full",
      timeStyle: "long"
    }).format(new Date());

    const prompt =
      "You are Search India AI. Answer accurately and clearly. " +
      "Reply in the user's language, including Hindi or Hinglish when appropriate. " +
      "Do not invent facts; state uncertainty when needed.\n" +
      "Current date and time: " + currentDateTime + "\n" +
      "Question: " + question;

    const parts = [{ text: prompt }];

    if (image) {
      const match = image.match(
        /^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/i
      );

      if (!match) {
        return res.status(400).json({
          error: "Unsupported image. Please choose JPG, PNG, or WebP."
        });
      }

      const mimeType =
        match[1].toLowerCase() === "image/jpg"
          ? "image/jpeg"
          : match[1].toLowerCase();

      const imageBase64 = match[2].replace(/\s/g, "");

      if (Math.floor(imageBase64.length * 3 / 4) > 4 * 1024 * 1024) {
        return res.status(413).json({
          error: "Image is too large. Please choose an image under 4 MB."
        });
      }

      parts.push({
        inline_data: {
          mime_type: mimeType,
          data: imageBase64
        }
      });
    }

    // Try Gemini models first.
    if (GEMINI_API_KEY) {
      for (const model of GEMINI_MODELS) {
        try {
          const response = await requestGemini(model, parts);
          const data = await response.json().catch(() => ({}));

          if (!response.ok) {
            console.error("Gemini model failed:", {
              model,
              status: response.status,
              message: data?.error?.message || "Unknown error"
            });

            if (
              [400, 404, 429, 500, 502, 503, 504].includes(
                response.status
              )
            ) {
              continue;
            }

            break;
          }

          const answer = (
            data?.candidates?.[0]?.content?.parts || []
          )
            .map((part) => part.text || "")
            .join("\n")
            .trim();

          if (!answer) continue;

          return res.status(200).json({
            success: true,
            answer,
            source: "Search India AI",
            model,
            currentDate: currentDateTime,
            timezone
          });
        } catch (error) {
          console.error("Gemini request failed:", {
            model,
            message: String(error?.message || error)
          });
        }
      }
    }

    // If Gemini models fail, try Groq for text questions.
    // Groq chat completion here does not accept image data.
    if (GROQ_API_KEY && !image) {
      const result = await requestGroq(
        question + "\nCurrent date and time: " + currentDateTime
      );

      if (result) {
        return res.status(200).json({
          success: true,
          answer: result.answer,
          source: "Search India AI",
          model: result.model,
          currentDate: currentDateTime,
          timezone
        });
      }
    }

    return res.status(503).json({
      error:
        "AI is temporarily unavailable or its quota is exhausted. " +
        "Please try again later. Web search can still work."
    });
  } catch (error) {
    console.error("Search India API error:", error);

    return res.status(500).json({
      error: "AI request failed. Check Vercel Runtime Logs."
    });
  }
          }
                        
