const MODEL = "gemini-3.8-flash";

const API_KEY =
  process.env.INDIAN_SEARCH_API_KEY ||
  process.env.SEARCH_INDIA_API_KEY ||
  process.env.GEMINI_API_KEY;

const wait = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function requestGemini(url, options) {
  let response;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      response = await fetch(url, options);

      if (
        ![429, 500, 502, 503, 504].includes(response.status)
      ) {
        return response;
      }
    } catch (error) {
      if (attempt === 2) throw error;
    }

    if (attempt < 2) {
      await wait(1000 * (2 ** attempt));
    }
  }

  return response;
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

    const image = typeof body.image === "string"
      ? body.image
      : "";

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

      const mimeType = match[1].toLowerCase() === "image/jpg"
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

    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/" +
      MODEL +
      ":generateContent";

    const apiResponse = await requestGemini(url, {
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

    const data = await apiResponse.json().catch(() => ({}));

    if (!apiResponse.ok) {
      console.error("Gemini API error:", {
        status: apiResponse.status,
        model: MODEL,
        message: data?.error?.message || "No provider message"
      });

      const temporary = [429, 500, 502, 503, 504]
        .includes(apiResponse.status);

      return res.status(temporary ? 503 : 502).json({
        error: temporary
          ? "Gemini is temporarily busy. Please try again shortly."
          : "Gemini API error. Check Vercel Runtime Logs."
      });
    }

    const answer = (
      data?.candidates?.[0]?.content?.parts || []
    )
      .map((part) => part.text || "")
      .join("\n")
      .trim();

    if (!answer) {
      console.error("Gemini returned no text:", {
        model: MODEL,
        finishReason: data?.candidates?.[0]?.finishReason
      });

      return res.status(502).json({
        error: "AI returned no answer. Please try again."
      });
    }

    return res.status(200).json({
      success: true,
      answer,
      source: "Search India AI",
      model: MODEL,
      currentDate: currentDateTime,
      timezone
    });
  } catch (error) {
    console.error("Search India API error:", error);

    return res.status(500).json({
      error: "AI request failed. Check Vercel Runtime Logs."
    });
  }
}  

            
