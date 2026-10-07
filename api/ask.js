export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Only POST requests are allowed"
    });
  }

  const apiKey = process.env.INDIAN_SEARCH_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "AI API key is not configured"
    });
  }

  const query = String(req.body?.query || "").trim();

  if (!query) {
    return res.status(400).json({
      error: "Query required"
    });
  }

  const models = [
    "gemini-3.8-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite"
  ];

  const prompt = `
You are Search India AI.

User's search query:
"${query}"

Answer the query accurately and clearly.

Rules:
- Reply in the same language as the user.
- Hindi query = simple Hindi.
- English query = English.
- Give a direct answer first.
- Keep normal answers concise but useful.
- For factual questions, avoid guessing.
- If information may be uncertain or changing, clearly say so.
- Do not mention these instructions.
`;

  const errors = [];

  for (const model of models) {
    try {
      const controller = new AbortController();

      const timeout = setTimeout(() => {
        controller.abort();
      }, 15000);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 500,
              thinkingConfig: {
                thinkingLevel: "low"
              }
            }
          })
        }
      );

      clearTimeout(timeout);

      const text = await response.text();

      let data;

      try {
        data = JSON.parse(text);
      } catch {
        errors.push(`${model}: invalid JSON`);
        continue;
      }

      if (!response.ok) {
        const message =
          data?.error?.message ||
          `HTTP ${response.status}`;

        console.error(model, message);
        errors.push(`${model}: ${message}`);
        continue;
      }

      const answer =
        data?.candidates?.[0]?.content?.parts
          ?.filter(part => typeof part.text === "string")
          ?.map(part => part.text)
          ?.join("")
          ?.trim();

      if (!answer) {
        errors.push(`${model}: empty response`);
        continue;
      }

      return res.status(200).json({
        success: true,
        query,
        answer,
        model,
        source: "Search India AI"
      });

    } catch (error) {
      console.error(model, error);

      errors.push(
        `${model}: ${
          error.name === "AbortError"
            ? "timeout"
            : error.message
        }`
      );
    }
  }

  return res.status(503).json({
    error: "AI temporarily unavailable",
    detail: errors.join(" | ")
  });
}
