"use strict";

const MODEL = "gemini-3.5-flash";
const MAX_IMAGE_LENGTH = 7 * 1024 * 1024;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");

    return res.status(405).json({
      success: false,
      error: "Only POST requests are allowed."
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
        error: "AI API key missing. Check Vercel Environment Variables."
      });
    }

    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body || {};

    const image =
      typeof body.image === "string" ? body.image : "";

    let question = String(
      body.question || body.query || body.prompt || ""
    ).trim();

    // Image-only searches should work without typing a question.
    if (!question && image) {
      question =
        "Describe this image clearly. Identify the visible objects, " +
        "read any clearly visible text, and explain what the image shows. " +
        "If it contains a question, answer that question.";
    }

    if (!question) {
      return res.status(400).json({
        success: false,
        error: "Please enter a question or select an image."
      });
    }

    let timezone = "Asia/Kolkata";
    const requestedTimezone = body.timeZone || body.timezone;

    if (
      typeof requestedTimezone === "string" &&
      requestedTimezone.trim()
    ) {
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

Instructions:
- Answer clearly, accurately, and helpfully.
- Reply in the language used by the user.
- If an image is attached, examine the image before answering.
- For image questions, describe only what is reasonably visible.
- If text in the image is unclear, say so instead of guessing.
- For current facts you cannot verify, be transparent.
- For date and time questions, use the date and time provided above.

User question:
${question}
`;

    const parts = [];

    if (image) {
      if (image.length > MAX_IMAGE_LENGTH) {
        return res.status(413).json({
          success: false,
          error: "Image bahut badi hai. Chhoti image select karein."
        });
      }

      const match = image.match(
        /^data:(image\/(?:png|jpeg|jpg|webp));base64,([A-Za-z0-9+/=\s]+)$/
      );

      if (!match) {
        return res.status(400).json({
          success: false,
          error: "Image format invalid hai. PNG, JPG ya WEBP image use karein."
        });
      }

      const mimeType =
        match[1] === "image/jpg"
          ? "image/jpeg"
          : match[1];

      parts.push({
        inline_data: {
          mime_type: mimeType,
          data: match[2].replace(/\s/g, "")
        }
      });
    }

    parts.push({ text: prompt });

    const apiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
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
        error:
          "AI provider error (" +
          apiResponse.status +
          "). Vercel Runtime Logs check karein."
      });
    }

    const answer = (
      data.candidates?.[0]?.content?.parts || []
    )
      .map((part) => part.text || "")
      .join("")
      .trim();

    if (!answer) {
      console.error("Gemini returned no text:", {
        finishReason: data.candidates?.[0]?.finishReason
      });

      return res.status(502).json({
        success: false,
        error: "AI returned no answer. Dobara try karein."
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
      error: "AI server error. Vercel Runtime Logs check karein."
    });
  }
}
