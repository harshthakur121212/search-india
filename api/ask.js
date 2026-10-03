
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Use POST to ask a question"
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY is not configured in Vercel"
    });
  }

  try {
    const query = String(req.body?.query || "").trim();

    if (!query) {
      return res.status(400).json({
        error: "Question is required"
      });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text:
                "You are Search India, a helpful assistant. " +
                "Answer in the same language as the user's question. " +
                "Be accurate, clear, and concise. If unsure, say so.\n\n" +
                "Question: " + query.slice(0, 4000)
            }]
          }]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", data);
      return res.status(502).json({
        error: "AI provider request failed",
        detail: data.error?.message || "Check API key, model, and quota."
      });
    }

    const answer = data.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("\n");

    return res.status(200).json({
      query,
      answer: answer || "अभी जवाब उपलब्ध नहीं है।"
    });
  } catch (error) {
    console.error("AI backend error:", error);
    return res.status(500).json({
      error: "AI backend failed"
    });
  }
}
