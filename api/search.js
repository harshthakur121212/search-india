// ==========================================
// 🇮🇳 SEARCH INDIA
// WEB SEARCH API - TAVILY
// ==========================================

export default async function handler(req, res) {

  // ------------------------------------------
  // CORS
  // ------------------------------------------

  res.setHeader(
    "Access-Control-Allow-Origin",
    "*"
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );


  // ------------------------------------------
  // OPTIONS
  // ------------------------------------------

  if (req.method === "OPTIONS") {

    return res.status(204).end();

  }


  // ------------------------------------------
  // ONLY GET
  // ------------------------------------------

  if (req.method !== "GET") {

    return res.status(405).json({
      error: "Only GET requests are allowed"
    });

  }


  // ------------------------------------------
  // SEARCH QUERY
  // ------------------------------------------

  const query =
    String(req.query?.q || "").trim();


  if (!query) {

    return res.status(400).json({
      error: "Search query required"
    });

  }


  // ------------------------------------------
  // TAVILY API KEY
  // ------------------------------------------

  const apiKey =
    process.env.TAVILY_API_KEY;


  if (!apiKey) {

    console.error(
      "TAVILY_API_KEY is missing"
    );

    return res.status(500).json({
      error: "Tavily API key is not configured"
    });

  }


  // ------------------------------------------
  // DIRECT WEBSITE URL
  // ------------------------------------------

  let directUrl = null;


  try {

    if (
      query.startsWith("https://") ||
      query.startsWith("http://")
    ) {

      const parsed =
        new URL(query);


      if (
        parsed.protocol === "https:" ||
        parsed.protocol === "http:"
      ) {

        directUrl =
          parsed.toString();

      }

    }

  } catch {

    directUrl = null;

  }


  // ------------------------------------------
  // DIRECT URL RESULT
  // ------------------------------------------

  if (directUrl) {

    return res.status(200).json({

      success: true,

      query: query,

      source: "Direct Website",

      results: [

        {
          title: directUrl,

          snippet:
            "यह website खोलने के लिए परिणाम पर tap करें।",

          url: directUrl
        }

      ]

    });

  }


  // ------------------------------------------
  // TAVILY WEB SEARCH
  // ------------------------------------------

  try {

    const tavilyResponse =
      await fetch(
        "https://api.tavily.com/search",
        {

          method: "POST",

          headers: {

            "Content-Type":
              "application/json"

          },

          body: JSON.stringify({

            api_key: apiKey,

            query: query,

            search_depth: "basic",

            topic: "general",

            max_results: 10,

            include_answer: true,

            include_raw_content: false,

            include_images: false,

            include_domains: [],

            exclude_domains: []

          })

        }
      );


    // ------------------------------------------
    // RESPONSE TEXT
    // ------------------------------------------

    const responseText =
      await tavilyResponse.text();


    let data;


    try {

      data =
        JSON.parse(responseText);

    } catch {

      console.error(
        "Invalid Tavily JSON:",
        responseText
      );

      return res.status(502).json({

        error:
          "Invalid response from web search provider"

      });

    }


    // ------------------------------------------
    // TAVILY ERROR
    // ------------------------------------------

    if (!tavilyResponse.ok) {

      console.error(
        "Tavily API error:",
        tavilyResponse.status,
        data
      );


      return res.status(502).json({

        error:
          "Web search provider error",

        status:
          tavilyResponse.status,

        detail:
          data?.detail ||
          data?.error ||
          "Tavily search failed"

      });

    }


    // ------------------------------------------
    // RESULTS
    // ------------------------------------------

    const tavilyResults =
      Array.isArray(data?.results)
        ? data.results
        : [];


    const results =
      tavilyResults

        .map((item) => {

          return {

            title:
              String(
                item?.title ||
                "Untitled"
              ),

            snippet:
              String(
                item?.content ||
                "इस website से जानकारी उपलब्ध है।"
              ),

            url:
              String(
                item?.url || ""
              ),

            score:
              typeof item?.score === "number"
                ? item.score
                : null

          };

        })

        .filter(
          item =>
            item.url &&
            /^https?:\/\//i.test(
              item.url
            )
        );


    // ------------------------------------------
    // NO RESULTS
    // ------------------------------------------

    if (
      results.length === 0
    ) {

      return res.status(200).json({

        success: true,

        query: query,

        source:
          "Tavily Web Search",

        answer:
          data?.answer || null,

        results: []

      });

    }


    // ------------------------------------------
    // SUCCESS
    // ------------------------------------------

    return res.status(200).json({

      success: true,

      query: query,

      source:
        "Tavily Web Search",

      answer:
        data?.answer || null,

      results:
        results

    });


  } catch (error) {

    // ------------------------------------------
    // SERVER ERROR
    // ------------------------------------------

    console.error(
      "Tavily search error:",
      error
    );


    return res.status(502).json({

      error:
        "Web search temporarily unavailable",

      detail:
        error?.message ||
        "Unknown error"

    });

  }

        }
