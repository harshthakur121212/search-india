
const GROQ_API_KEY = process.env.SEARCH_HARSH_API_KEY;
const GROQ_MODEL = "qwen/qwen3.8-27b";

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      success: false,
      error: "Only POST requests are allowed."
    });
  }

  if (!GROQ_API_KEY) {
    return res.status(500).json({
      success: false,
      error: "SEARCH_HARSH_API_KEY Vercel Environment Variables mein set nahi hai."
    });
  }

  try {
    let body = req.body;

    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({
          success: false,
          error: "Invalid JSON request."
        });
      }
    }

    body = body || {};

    const question = String(
      body.question || body.query || body.prompt || ""
    ).trim();

    const image = body.image || null;

    if (!question && !image) {
      return res.status(400).json({
        success: false,
        error: "Please enter a question or select an image."
      });
    }

    if (question.length > 10000) {
      return res.status(400).json({
        success: false,
        error: "Question bahut lamba hai. Chhota question likhein."
      });
    }

    const timezoneCandidate =
      body.timeZone || body.timezone || "Asia/Kolkata";

    let timezone = "Asia/Kolkata";

    try {
      Intl.DateTimeFormat("en-US", {
        timeZone: timezoneCandidate
      });
      timezone = timezoneCandidate;
    } catch {
      timezone = "Asia/Kolkata";
    }

    const currentDateTime = new Date().toLocaleString("en-IN", {
      timeZone: timezone,
      dateStyle: "full",
      timeStyle: "long"
    });

    const messages = [
      {
        role: "system",
        content:
          "You are Search India AI, a helpful and accurate assistant. " +
          "Answer clearly in the language used by the user. " +
          "For Indian topics, provide relevant Indian context. " +
          "Do not invent facts, sources, links, or current information. " +
          "If uncertain, clearly say so. " +
          "Current date and time for this request: " +
          currentDateTime
      }
    ];

    const userContent = [];

    if (image) {
      if (typeof image !== "string") {
        return res.status(400).json({
          success: false,
          error: "Image format is invalid."
        });
      }

      const imageMatch = image.match(
        /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/
      );

      if (!imageMatch) {
        return res.status(400).json({
          success: false,
          error: "JPG, PNG ya WEBP image select karein."
        });
      }

      const imageBytes = Buffer.from(imageMatch[2], "base64");

      if (imageBytes.length > 4 * 1024 * 1024) {
        return res.status(413).json({
          success: false,
          error: "Image 4 MB se chhoti honi chahiye."
        });
      }

      userContent.push({
        type: "image_url",
        image_url: {
          url: image
        }
      });
    }

    userContent.push({
      type: "text",
      text: question || "Is image ko dhyan se dekho aur samjhao."
    });

    messages.push({
      role: "user",
      content: userContent
    });

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages,
          temperature: 0.3,
          max_tokens: 1500
        })
      }
    );

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error(
        "Groq API error:",
        response.status,
        result.error?.message || "Unknown provider error"
      );

      if (response.status === 401 || response.status === 403) {
        return res.status(502).json({
          success: false,
          error: "Groq API key invalid hai ya access allowed nahi hai."
        });
      }

      if (response.status === 429) {
        return res.status(503).json({
          success: false,
          error: "Groq rate limit ya quota reached hai. Baad mein try karein."
        });
      }

      return res.status(502).json({
        success: false,
        error: "Groq AI service se response nahi mila.",
        details: result.error?.message || "Provider request failed."
      });
    }

    const answer = result.choices?.[0]?.message?.content;

    if (!answer || typeof answer !== "string") {
      return res.status(502).json({
        success: false,
        error: "AI ne khaali response diya. Dobara try karein."
      });
    }

    return res.status(200).json({
      success: true,
      answer: answer.trim(),
      source: "Search India AI",
      model: GROQ_MODEL,
      currentDate: currentDateTime,
      timezone
    });
  } catch (error) {
    console.error("Search India AI error:", error.message);

    return res.status(500).json({
      success: false,
      error: "Server mein problem aayi. Vercel Runtime Logs check karein."
    });
  }
};
      
