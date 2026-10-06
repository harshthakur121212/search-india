export default async function handler(req, res) {
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

  const q = String(req.query?.q || "").trim();

  if (!q) {
    return res.status(400).json({
      error: "Search query required"
    });
  }

  try {
    const lang = /[\u0900-\u097F]/.test(q) ? "hi" : "en";

    const api = new URL(
      `https://${lang}.wikipedia.org/w/api.php`
    );

    api.searchParams.set("action", "query");
    api.searchParams.set("list", "search");
    api.searchParams.set("srsearch", q);
    api.searchParams.set("srlimit", "8");
    api.searchParams.set("format", "json");
    api.searchParams.set("origin", "*");

    const response = await fetch(api.toString(), {
      headers: {
        "User-Agent": "SearchIndia/1.0"
      }
    });

    const text = await response.text();

    if (!response.ok) {
      console.error("Wikipedia status:", response.status);
      console.error("Wikipedia response:", text);

      return res.status(502).json({
        error: "Search provider error",
        status: response.status
      });
    }

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      return res.status(502).json({
        error: "Invalid search provider response"
      });
    }

    const items = Array.isArray(data?.query?.search)
      ? data.query.search
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
          String(item.title || "").replace(/ /g, "_")
        )
    }));

    return res.status(200).json({
      query: q,
      results
    });

  } catch (error) {
    console.error("Search backend error:", error);

    return res.status(502).json({
      error: "Search service unavailable",
      detail: error.message
    });
  }
      }
