export default async function handler(req, res) {
  // -----------------------------
  // CORS
  // -----------------------------
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Only GET requests are allowed"
    });
  }

  // -----------------------------
  // Get search query
  // -----------------------------
  const q = String(req.query?.q || "").trim();

  if (!q) {
    return res.status(400).json({
      error: "Search query required"
    });
  }

  // -----------------------------
  // Tavily API Key
  // -----------------------------
  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "TAVILY_API_KEY is not configured"
    });
  }

  // -----------------------------
  // Direct URL detection
  // -----------------------------
  let directUrl = null;

  try {
    const possibleUrl =
      q.startsWith("http://") || q.startsWith("https://")
        ? new URL(q)
        : null;

    if (
      possibleUrl &&
      (possibleUrl.protocol === "http:" ||
        possibleUrl.protocol === "https:")
    ) {
      directUrl = possibleUrl.toString();
    }
  } catch {
    directUrl = null;
  }

  // -----------------------------
  // If user entered a URL
  // -----------------------------
  if (directUrl) {
    return res.status(200).json({
      query: q,
      results: [
        {
          title: directUrl,
          snippet: "यह website खोलने के लिए नीचे परिणाम पर tap करें।",
          url: directUrl
        }
      ],
      source: "Direct URL"
    });
  }

  // -----------------------------
  // Tavily Web Search
  // -----------------------------
  try {
    const response = await fetch(
      "https://api.tavily.com/search",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          api_key: apiKey,
          query: q,
          search_depth: "basic",
          topic: "general",
          max_results: 10,
          include_answer: false,
          include_raw_content: false,
          include_images: false
        })
      }
    );

    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      return res.status(502).json({
        error: "Invalid Tavily response"
      });
    }

    if (!response.ok) {
      console.error("Tavily error:", response.status, data);

      return res.status(502).json({
        error: "Web search provider error",
        status: response.status,
        detail:
          data?.detail ||
          data?.error ||
          "Tavily search failed"
      });
    }

    // -----------------------------
    // Convert Tavily results
    // -----------------------------
    const tavilyResults = Array.isArray(data?.results)
      ? data.results
      : [];

    const results = tavilyResults
      .map(item => ({
        title: String(item?.title || "Untitled"),
        snippet: String(
          item?.content ||
          "इस result की जानकारी उपलब्ध नहीं है।"
        ),
        url: String(item?.url || "")
      }))
      .filter(item => item.url);

    return res.status(200).json({
      query: q,
      results,
      source: "Tavily Web Search"
    });

  } catch (error) {
    console.error("Tavily search error:", error);

    // -----------------------------
    // Wikipedia fallback
    // -----------------------------
    try {
      const lang = /[\u0900-\u097F]/.test(q)
        ? "hi"
        : "en";

      const api = new URL(
        `https://${lang}.wikipedia.org/w/api.php`
      );

      api.searchParams.set("action", "query");
      api.searchParams.set("list", "search");
      api.searchParams.set("srsearch", q);
      api.searchParams.set("srlimit", "8");
      api.searchParams.set("format", "json");
      api.searchParams.set("origin", "*");

      const wikiResponse = await fetch(
        api.toString(),
        {
          headers: {
            "User-Agent": "SearchIndia/1.0"
          }
        }
      );

      const wikiText = await wikiResponse.text();

      let wikiData;

      try {
        wikiData = JSON.parse(wikiText);
      } catch {
        return res.status(502).json({
          error: "Web search temporarily unavailable"
        });
      }

      const items = Array.isArray(
        wikiData?.query?.search
      )
        ? wikiData.query.search
        : [];

      const results = items.map(item => ({
        title: item.title || "Untitled",

        snippet: String(item.snippet || "")
          .replace(/<[^>]*>/g, "")
          .replace(/&quot;/g, '"')
          .replace(/&#039;/g, "'")
          .replace(/&amp;/g, "&"),

        url:
          `https://${lang}.wikipedia.org/wiki/` +
          encodeURIComponent(
            String(item.title || "")
              .replace(/ /g, "_")
          )
      }));

      return res.status(200).json({
        query: q,
        results,
        source: "Wikipedia Fallback"
      });

    } catch (fallbackError) {
      console.error(
        "Fallback search error:",
        fallbackError
      );

      return res.status(502).json({
        error: "Web search temporarily unavailable"
      });
    }
  }
}
