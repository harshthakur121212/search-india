
const FEEDS = [
  {
    name: "BBC Hindi",
    url: "https://feeds.bbci.co.uk/hindi/rss.xml"
  },
  {
    name: "News On AIR",
    url: "https://www.newsonair.gov.in/feed/"
  },
  {
    name: "PIB India",
    url: "https://pib.gov.in/RssMain.aspx?ModId=6"
  }
];

function decodeEntities(value = "") {
  return String(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) =>
      String.fromCodePoint(Number(n))
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, n) =>
      String.fromCodePoint(parseInt(n, 16))
    )
    .trim();
}

function getTag(xml, tag) {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = xml.match(
    new RegExp(
      `<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}\\s*>`,
      "i"
    )
  );

  return match ? decodeEntities(match[1]) : "";
}

function getImage(item) {
  const patterns = [
    /<media:content\b[^>]*\burl=["']([^"']+)["']/i,
    /<media:thumbnail\b[^>]*\burl=["']([^"']+)["']/i,
    /<enclosure\b[^>]*\burl=["']([^"']+)["']/i,
    /<img\b[^>]*\bsrc=["']([^"']+)["']/i
  ];

  for (const pattern of patterns) {
    const match = item.match(pattern);

    if (match && /^https?:\/\//i.test(match[1])) {
      return match[1];
    }
  }

  return "";
}

function cleanText(value = "") {
  return decodeEntities(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseFeed(xml, source) {
  const items = xml.match(/<(?:item|entry)\b[\s\S]*?<\/(?:item|entry)\s*>/gi) || [];

  return items.map(item => {
    const title = cleanText(getTag(item, "title"));

    let link = getTag(item, "link");

    if (!link) {
      const linkMatch = item.match(
        /<link\b[^>]*\bhref=["']([^"']+)["']/i
      );
      link = linkMatch ? linkMatch[1] : "";
    }

    link = decodeEntities(link).trim();

    const description = cleanText(
      getTag(item, "description") ||
      getTag(item, "summary") ||
      getTag(item, "content:encoded") ||
      getTag(item, "content")
    );

    const pubDate =
      getTag(item, "pubDate") ||
      getTag(item, "published") ||
      getTag(item, "updated") ||
      "";

    let safeLink = "";

    try {
      const parsed = new URL(link);
      if (parsed.protocol === "https:" || parsed.protocol === "http:") {
        safeLink = parsed.href;
      }
    } catch {}

    return {
      title,
      link: safeLink,
      description: description.slice(0, 350),
      pubDate,
      image: getImage(item),
      source
    };
  }).filter(item => item.title && item.link);
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({
      error: "Only GET requests are allowed."
    });
  }

  try {
    const feedResults = await Promise.allSettled(
      FEEDS.map(async feed => {
        const response = await fetch(feed.url, {
          headers: {
            "User-Agent": "SearchIndia/1.0 (RSS reader)"
          },
          signal: AbortSignal.timeout(7000)
        });

        if (!response.ok) {
          throw new Error(`Feed returned ${response.status}`);
        }

        const xml = await response.text();
        return parseFeed(xml, feed.name);
      })
    );

    const articles = feedResults
      .filter(result => result.status === "fulfilled")
      .flatMap(result => result.value);

    const unique = [];
    const seen = new Set();

    for (const article of articles) {
      const key = article.link;

      if (!seen.has(key)) {
        seen.add(key);
        unique.push(article);
      }
    }

    unique.sort((a, b) => {
      const dateA = Date.parse(a.pubDate) || 0;
      const dateB = Date.parse(b.pubDate) || 0;
      return dateB - dateA;
    });

    return res.status(200).json({
      success: true,
      count: unique.length,
      updatedAt: new Date().toISOString(),
      news: unique.slice(0, 30),
      message: unique.length
        ? "News loaded successfully."
        : "News feeds are temporarily unavailable."
    });
  } catch (error) {
    console.error("Search India news error:", error);

    return res.status(502).json({
      success: false,
      count: 0,
      news: [],
      error: "News is temporarily unavailable. Please try again."
    });
  }
};
                           
