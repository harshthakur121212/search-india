const MODEL = "gemini-3.5-flash";

const API_KEY =
  process.env.INDIAN_SEARCH_API_KEY ||
  process.env.SEARCH_INDIA_API_KEY ||
  process.env.GEMINI_API_KEY;

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function fetchGeminiWithRetry(url, options) {
  let response;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      response = await fetch(url, options);

      // Retry only temporary server/rate-limit errors.
      if (
        ![429, 500, 502, 503, 504].includes(response.status)
      ) {
        return response;
      }

      if (attempt < 2) {
        await sleep(1000 * (2 ** attempt));
      }
    } catch (error) {
      if (attempt === 2) {
        throw error;
      }

      await sleep(1000 * (2 ** attempt));
    }
  }

  return response;
}

function sendJson(res, status, data) {
  return res.status(status).json(data);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, {
      error: "Only POST requests are allowed."
    });
  }

  if (!API_KEY) {
    return sendJson(res, 500, {
      error:
        "API key missing. Add INDIAN_SEARCH_API_KEY or SEARCH_INDIA_API_KEY in Vercel Environment Variables."
    });
  }

  try {
    const body = req.body || {};

    let question =
      typeof body.question === "string"
        ? body.question.trim()
        : "";

    const imageData =
      typeof body.image === "string"
        ? body.image
        : "";

    // Allow image-only questions.
    if (!question && imageData) {
      question =
        "Describe this image and answer the question it raises. Reply in Hindi unless the image or question requires another language.";
    }

    if (!question) {
      return sendJson(res, 400, {
        error: "Please enter a question."
      });
    }

    const parts = [
      {
        text:
          "You are the AI assistant for Search India. " +
          "Answer accurately, clearly, and helpfully. " +
          "Use Hindi when the user writes in Hindi or Hinglish; " +
          "otherwise follow the user's language. " +
          "Do not invent facts. If uncertain, say so. " +
          "For image questions, describe only what is reasonably visible. " +
          "Question: " +
          question
      }
    ];

    if (imageData) {
      const match = imageData.match(
        /^data:(image\/(?:jpeg|jpg|png|webp|heic|heif));base64,([A-Za-z0-9+/=\s]+)$/i
      );

      if (!match) {
        return sendJson(res, 400, {
          error:
            "Unsupported image format. Please select a JPG, PNG, or WebP image."
        });
      }

      const mimeType = match[1].toLowerCase();
      const base64Data = match[2].replace(/\s/g, "");

      // Limit decoded image size to approximately 4 MB.
      const estimatedBytes = Math.floor(
        (base64Data.length * 3) / 4
      );

      if (estimatedBytes > 4 * 1024 * 1024) {
        return sendJson(res, 413, {
          error: "Image is too large. Please choose an image under 4 MB."
        });
      }

      parts.push({
        inline_data: {
          mime_type: mimeType,
          data: base64Data
        }
      });
    }

    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/" +
      MODEL +
      ":generateContent?key=" +
      encodeURIComponent(API_KEY);

    const apiResponse = await fetchGeminiWithRetry(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts
          }
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1200
        }
      })
    });

    const data = await apiResponse.json().catch(() => ({}));

    if (!apiResponse.ok) {
      // Detailed provider errors are kept in Vercel logs.
      console.error("Gemini API error:", {
        status: apiResponse.status,
        message: data?.error?.message || "No provider error message",
        model: MODEL
      });

      if ([429, 500, 502, 503, 504].includes(apiResponse.status)) {
        return sendJson(res, 503, {
          error:
            "AI service is temporarily busy. Please try again in a little while."
        });
      }

      if (apiResponse.status === 401 || apiResponse.status === 403) {
        return sendJson(res, 502, {
          error:
            "AI provider rejected the API key. Check the key and its permissions in Vercel."
        });
      }

      if (apiResponse.status === 404) {
        return sendJson(res, 502, {
          error:
            "The configured Gemini model is unavailable. Check the model name and API access."
        });
      }

      return sendJson(res, 502, {
        error: "AI provider error. Check Vercel Runtime Logs."
      });
    }

    const answer = (
      data?.candidates?.[0]?.content?.parts || []
    )
      .map((part) => part.text || "")
      .join("\n")
      .trim();

    if (!answer) {
      console.error(
        "Gemini returned no text:",
        JSON.stringify(data).slice(0, 1500)
      );

      return sendJson(res, 502, {
        error:
          "AI did not return an answer. Please try asking in a different way."
      });
    }

    return sendJson(res, 200, {
      answer,
      model: MODEL
    });
  } catch (error) {
    console.error("Search India AI route error:", error);

    return sendJson(res, 500, {
      error:
        "The AI request could not be completed. Please try again."
    });
  }
  }
