
const MODELS = [
  "gemini-3.8-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite"
];

const API_KEY =
  process.env.INDIAN_SEARCH_API_KEY ||
  process.env.SEARCH_INDIA_API_KEY ||
  process.env.GEMINI_API_KEY;

async function requestGemini(model, parts) {
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    model +
    ":generateContent";

  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": API_KEY
    },
    body: JSON.stringify({
      contents: [{
        role: "user",
        parts
      }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1200
      }
    })
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "Only POST requests are allowed."
    });
  }

  if (!API_KEY) {
    return res.status(500).json({
      error: "Gemini API key missing. Check Vercel Environment Variables."
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

    const parts = [{
      text:
        "You are Search India AI. Answer accurately and clearly. " +
        "Reply in the user's language, including Hindi or Hinglish when appropriate. " +
        "Do not invent facts; state uncertainty when needed.\n" +
        "Current date and time: " + currentDateTime + "\n" +
        "Question: " + question
    }];

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
      const estimatedBytes = Math.floor(
        imageBase64.length * 3 / 4
      );

      if (estimatedBytes > 4 * 1024 * 1024) {
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

    let lastStatus = 503;
    let lastMessage = "No model returned an answer.";

    for (const model of MODELS) {
      let response;
      let data = {};

      try {
        response = await requestGemini(model, parts);
        data = await response.json().catch(() => ({}));
      } catch (error) {
        lastStatus = 503;
        lastMessage = String(error?.message || error);

        console.error("Gemini network error:", {
          model,
          message: lastMessage
        });

        // Network failure: try the next model.
        continue;
      }

      if (!response.ok) {
        lastStatus = response.status;
        lastMessage =
          data?.error?.message || "Unknown Gemini API error.";

        console.error("Gemini model failed:", {
          model,
          status: response.status,
          message: lastMessage
        });

        // Try the next model for quota, temporary service,
        // unavailable-model, or model-access errors.
        if (
          [404, 429, 500, 502, 503, 504].includes(response.status)
        ) {
          continue;
        }

        // Other errors may affect every model, so stop here.
        return res.status(502).json({
          error: "Gemini request failed. Check Vercel Runtime Logs."
        });
      }

      const answer = (
        data?.candidates?.[0]?.content?.parts || []
      )
        .map((part) => part.text || "")
        .join("\n")
        .trim();

      if (!answer) {
        lastStatus = 502;
        lastMessage = "The model returned no text.";

        console.error("Gemini returned no text:", {
          model,
          finishReason: data?.candidates?.[0]?.finishReason
        });

        continue;
      }

      // First successful model ends the fallback loop.
      return res.status(200).json({
        success: true,
        answer,
        source: "Search India AI",
        model,
        currentDate: currentDateTime,
        timezone
      });
    }

    console.error("All Gemini fallback models failed:", {
      models: MODELS,
      lastStatus,
      lastMessage
    });

    return res.status(503).json({
      error:
        "AI is temporarily unavailable or its free quota is exhausted. " +
        "Please try again later. Web search can still work."
    });

  } catch (error) {
    console.error("Search India API error:", error);

    return res.status(500).json({
      error: "AI request failed. Check Vercel Runtime Logs."
    });
  }
          }
