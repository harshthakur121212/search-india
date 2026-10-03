
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

  const q = String(req.query.q || "").trim();

  if (!q) {
    return res.status(400).json({
      error: "Search query required"
    });
  }

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

  try {
    const response = await fetch(api.toString());

    if (!response.ok) {
      return res.status(502).json({
        error: "Search provider error",
        status: response.status
      });
    }

    const data = await response.json();

    return res.status(200).json({
      query: q,
      results: (data.query?.search || []).map(item => ({
        title: item.title,
        snippet: item.snippet.replace(/<[^>]*>/g, ""),
        url:
          `https://${lang}.wikipedia.org/wiki/` +
          encodeURIComponent(item.title.replace(/ /g, "_"))
      }))
    });
  } catch (error) {
    return res.status(502).json({
      error: "Search service unavailable"
    });
  }
}

