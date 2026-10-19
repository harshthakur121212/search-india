
const PROVIDERS = [
  {
    name: "Groq",
    apiKey: process.env.SEARCH_HARSH_API_KEY,
    url: "https://api.groq.com/openai/v1/chat/completions",
    model: "qwen/qwen3.8-27b",
  },
  {
    name: "OpenRouter",
    apiKey: process.env.HARSH_APP_API_KEY,
    url: "https://openrouter.ai/api/v1/chat/completions",
    model: "openrouter/free",
  },
  {
    name: "Mistral",
    apiKey: process.env.SEARCH_SEARCH_API_KEY,
    url: "https://api.mistral.ai/v1/chat/completions",
    model: "ministral-14b-latest",
  },
];

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      success: false,
      error: "Only POST requests are allowed.",
    });
  }

  let body = req.body;

  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({
        success: false,
        error: "Invalid JSON request.",
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
      error: "Please enter a question or select an image.",
    });
  }

  if (question.length > 10000) {
    return res.status(400).json({
      success: false,
      error: "Question bahut lamba hai. Chhota question likhein.",
    });
  }

  let timezone = "Asia/Kolkata";
  const timezoneCandidate = body.timeZone || body.timezone;

  if (timezoneCandidate) {
    try {
      Intl.DateTimeFormat("en-US", {
        timeZone: timezoneCandidate,
      });
      timezone = timezoneCandidate;
    } catch {
      timezone = "Asia/Kolkata";
    }
  }

  const currentDateTime = new Date().toLocaleString("en-IN", {
    timeZone: timezone,
    dateStyle: "full",
    timeStyle: "long",
  });

  const userContent = [];

  if (image) {
    if (typeof image !== "string") {
      return res.status(400).json({
        success: false,
        error: "Image format is invalid.",
      });
    }

    const match = image.match(
      /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/
    );

    if (!match) {
      return res.status(400).json({
        success: false,
        error: "JPG, PNG ya WEBP image select karein.",
      });
    }

    const imageBytes = Buffer.from(match[2], "base64");

    if (imageBytes.length > 4 * 1024 * 1024) {
      return res.status(413).json({
        success: false,
        error: "Image 4 MB se chhoti honi chahiye.",
      });
    }

    userContent.push({
      type: "image_url",
      image_url: {
        url: image,
      },
    });
  }

  userContent.push({
    type: "text",
    text: question || "Is image ko dhyan se dekho aur samjhao.",
  });

  const messages = [
    {
      role: "system",
      content:
        "You are Search India AI, a helpful and accurate assistant. " +
        "Answer in the language used by the user. " +
        "For Indian topics, provide relevant Indian context. " +
        "Explain clearly and use examples when helpful. " +
        "Never invent facts, links, sources, or current information. " +
        "If you are uncertain, say so clearly. " +
        "Current date and time: " +
        currentDateTime +
        ". Timezone: " +
        timezone +
        ".",
    },
    {
      role: "user",
      content: userContent,
    },
  ];

  const configuredProviders = PROVIDERS.filter(
    (provider) =>
      typeof provider.apiKey === "string" &&
      provider.apiKey.trim().length > 0
  );

  if (configuredProviders.length === 0) {
    return res.status(500).json({
      success: false,
      error:
        "Vercel mein AI API keys set nahi hain. Environment Variables check karein.",
    });
  }

  const errors = [];

  for (const provider of configuredProviders) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 18000);

      let response;

      try {
        response = await fetch(provider.url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${provider.apiKey.trim()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: provider.model,
            messages,
            temperature: 0.3,
            max_tokens: 1500,
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        const providerMessage =
          result?.error?.message ||
          result?.message ||
          `HTTP ${response.status}`;

        console.error(
          `${provider.name} API error:`,
          response.status,
          providerMessage
        );

        errors.push({
          provider: provider.name,
          status: response.status,
        });

        // Try the next provider.
        continue;
      }

      const content = result?.choices?.[0]?.message?.content;

      let answer = "";

      if (typeof content === "string") {
        answer = content.trim();
      } else if (Array.isArray(content)) {
        answer = content
          .map((part) =>
            typeof part?.text === "string" ? part.text : ""
          )
          .filter(Boolean)
          .join("\n")
          .trim();
      }

      if (!answer) {
        console.error(`${provider.name}: Empty AI response.`);
        errors.push({
          provider: provider.name,
          status: "empty_response",
        });
        continue;
      }

      return res.status(200).json({
        success: true,
        answer,
        source: "Search India AI",
        provider: provider.name,
        model: provider.model,
        currentDate: currentDateTime,
        timezone,
      });
    } catch (error) {
      console.error(
        `${provider.name} request failed:`,
        error.name === "AbortError"
          ? "Request timed out"
          : error.message
      );

      errors.push({
        provider: provider.name,
        status:
          error.name === "AbortError" ? "timeout" : "request_failed",
      });

      // Continue to the next configured provider.
    }
  }

  console.error("All configured AI providers failed:", errors);

  return res.status(503).json({
    success: false,
    error:
      "Abhi AI se response nahi mil raha. Thodi der baad dobara try karein.",
  });
};
  
