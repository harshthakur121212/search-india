
const MODEL = "gemini-2.5-flash";

export default async function handler(req, res) {
  if (req.method !== "POST") {
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
        message: "AI API key is missing in Vercel."
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

    // Browser timezone; fallback is India.
    let timezone = "Asia/Kolkata";
    const requestedTimezone =
      body.timeZone || body.timezone || "";

    if (typeof requestedTimezone === "string") {
      try {
        new Intl.DateTimeFormat("en-US", {
          timeZone: requestedTimezone
        });
        if (requestedTimezone) timezone = requestedTimezone;
      } catch {
        timezone = "Asia/Kolkata";
      }
    }

    const now = new Date();

    const currentDateTime = new Intl.DateTimeFormat("en-IN", {
      timeZone: timezone,
      dateStyle: "full",
      timeStyle: "long"
    }).format(now);

    const prompt = `
You are Search India AI.

The current date and time for this user is:
${currentDateTime}

The user's timezone is: ${timezone}

Instructions:
1. If asked for today's date, give the date above.
2. If asked for the current time, give the time above.
3. Never invent today's date or current time.
4. Answer in the language used by the user.
5. For other locations, only state their local time if their
   timezone can be identified reliably.
6. Give clear, useful answers. Admit uncertainty when needed.

User's question:
${question}
`;

    const parts = [{ text: prompt }];

    // Optional image support for data URLs.
    if (typeof body.image === "string") {
      const match = body.image.match(
        /^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,([A-Za-z0-9+/=\s]+)$/
      );

      if (match) {
        parts.unshift({
          inline_data: {
            mime_type:
              match[1] === "image/jpg"
                ? "image/jpeg"
                : match[1],
            data: match[2].replace(/\s/g, "")
          }
        });
      }
    }

    const apiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
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
      console.error("Gemini API error:", data);
      return res.status(502).json({
        success: false,
        message: "AI request failed. Check the API key and Vercel logs."
      });
    }

    const answer = (data.candidates?.[0]?.content?.parts || [])
      .map(part => part.text || "")
      .join("")
      .trim();

    if (!answer) {
      return res.status(502).json({
        success: false,
        message: "AI returned an empty answer."
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
    console.error("ask.js error:", error);

    return res.status(500).json({
      success: false,
      message: "An internal server error occurred."
    });
  }
        }
