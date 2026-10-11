
const MODEL = "gemini-3.5-flash";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      success: false,
      message: "Only POST requests are allowed."
    });
  }

  try {
    const apiKey =
      process.env.INDIAN_SEARCH_API_KEY ||
      process.env.SEARCH_INDIA_API_KEY ||
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: "AI API key missing. Check Vercel Environment Variables."
      });
    }

    const body = req.body || {};
    const question = String(
      body.question || body.query || body.prompt || ""
    ).trim();

    if (!question) {
      return res.status(400).json({
        success: false,
        message: "Please enter a question."
      });
    }

    let timezone = "Asia/Kolkata";
    const requestedTimezone = body.timeZone || body.timezone;

    if (typeof requestedTimezone === "string" && requestedTimezone) {
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

    const prompt = `
You are Search India AI.
Current local date and time: ${currentDateTime}
User timezone: ${timezone}

Answer the user's question clearly and helpfully.
Reply in the language the user uses.
For current facts that you cannot verify, be transparent.
For date or time questions, use the date and time provided above.

User question:
${question}
`;

    const parts = [{ text: prompt }];

    if (typeof body.image === "string") {
      const match = body.image.match(
        /^data:(image\/(?:png|jpeg|jpg|webp));base64,([A-Za-z0-9+/=\s]+)$/
      );

      if (match) {
        parts.unshift({
          inline_data: {
            mime_type: match[1] === "image/jpg"
              ? "image/jpeg"
              : match[1],
            data: match[2].replace(/\s/g, "")
          }
        });
      }
    }

    const apiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2048
          }
        })
      }
    );

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      console.error("Gemini API failure:", {
        status: apiResponse.status,
        error: data.error?.message || "Unknown provider error"
      });

      return res.status(502).json({
        success: false,
        message: `AI provider error (${apiResponse.status}). Check Vercel Runtime Logs.`
      });
    }

    const answer = (data.candidates?.[0]?.content?.parts || [])
      .map(part => part.text || "")
      .join("")
      .trim();

    if (!answer) {
      console.error("Gemini returned no text:", {
        finishReason: data.candidates?.[0]?.finishReason
      });

      return res.status(502).json({
        success: false,
        message: "AI returned no text. Check Vercel Runtime Logs."
      });
    }

    return res.status(200).json({
      success: true,
      answer,
      source: "Search India AI",
      currentDate: currentDateTime,
      timezone
    });
  } catch (error) {
    console.error("ask.js internal error:", error);

    return res.status(500).json({
      success: false,
      message: "AI server error. Check Vercel Runtime Logs."
    });
  }
          }
