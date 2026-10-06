// ========================================
// SEARCH INDIA 🇮🇳
// MAIN APP.JS
// ========================================

// ========================================
// API
// ========================================

const API_BASE = "https://search-india.vercel.app";

// ========================================
// ELEMENTS
// ========================================

const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");

const searchSection =
  document.getElementById("searchSection");

const searchStatus =
  document.getElementById("searchStatus");

const results =
  document.getElementById("results");

const answerSection =
  document.getElementById("answerSection");

const directAnswer =
  document.getElementById("directAnswer");

const answerSource =
  document.getElementById("answerSource");


// ========================================
// SEARCH FORM
// ========================================

searchForm.addEventListener(
  "submit",
  async function (event) {

    event.preventDefault();

    const query =
      searchInput.value.trim();

    if (!query) {
      searchInput.focus();
      return;
    }

    await performSearch(query);
  }
);


// ========================================
// QUICK SEARCH BUTTONS
// ========================================

document
  .querySelectorAll("[data-query]")
  .forEach((button) => {

    button.addEventListener(
      "click",
      async () => {

        const query =
          button.dataset.query;

        searchInput.value = query;

        window.scrollTo({
          top: 0,
          behavior: "smooth"
        });

        await performSearch(query);
      }
    );

  });


// ========================================
// MAIN SEARCH
// ========================================

async function performSearch(query) {

  // --------------------------------------
  // BUTTON LOADING
  // --------------------------------------

  searchBtn.disabled = true;
  searchBtn.textContent =
    "खोज रहे हैं...";

  searchStatus.textContent =
    `🔎 "${query}" खोजा जा रहा है...`;

  // --------------------------------------
  // CLEAR OLD RESULTS
  // --------------------------------------

  results.replaceChildren();

  answerSection.classList.add("hidden");

  searchSection.classList.remove("hidden");

  try {

    // ====================================
    // 1. WEB SEARCH
    // ====================================

    const searchUrl =
      `${API_BASE}/api/search?q=${encodeURIComponent(query)}`;

    const searchResponse =
      await fetchWithTimeout(
        searchUrl,
        {
          method: "GET"
        },
        15000
      );

    const searchText =
      await searchResponse.text();

    let searchData = {};

    try {
      searchData =
        searchText
          ? JSON.parse(searchText)
          : {};
    } catch {
      throw new Error(
        "Search API ने invalid response दिया।"
      );
    }

    if (!searchResponse.ok) {

      throw new Error(
        searchData?.error ||
        `Search API Error: ${searchResponse.status}`
      );
    }

    const searchResults =
      Array.isArray(searchData?.results)
        ? searchData.results
        : [];

    // ====================================
    // SHOW SEARCH RESULTS
    // ====================================

    if (searchResults.length === 0) {

      const empty =
        document.createElement("div");

      empty.className =
        "result-card";

      const title =
        document.createElement("h3");

      title.textContent =
        "कोई परिणाम नहीं मिला";

      const text =
        document.createElement("p");

      text.textContent =
        "इस विषय पर अभी कोई परिणाम उपलब्ध नहीं है। दूसरा शब्द इस्तेमाल करके फिर खोजें।";

      empty.appendChild(title);
      empty.appendChild(text);

      results.appendChild(empty);

    } else {

      searchResults.forEach((item) => {

        const card =
          document.createElement("article");

        card.className =
          "result-card";


        const title =
          document.createElement("h3");


        const link =
          document.createElement("a");

        link.href =
          item.url || "#";

        link.target =
          "_blank";

        link.rel =
          "noopener noreferrer";

        link.textContent =
          item.title ||
          "Search Result";


        title.appendChild(link);


        const snippet =
          document.createElement("p");

        snippet.textContent =
          item.snippet ||
          "इस परिणाम की जानकारी उपलब्ध है।";


        card.appendChild(title);

        card.appendChild(snippet);

        results.appendChild(card);

      });

    }


    // ====================================
    // 2. AI ANSWER
    // ====================================

    await getAIAnswer(query);


    // ====================================
    // SUCCESS
    // ====================================

    searchStatus.textContent =
      `✅ "${query}" के परिणाम मिल गए।`;


  } catch (error) {

    console.error(
      "Search error:",
      error
    );


    searchStatus.textContent =
      "❌ Search में समस्या आई।";


    results.replaceChildren();


    const errorCard =
      document.createElement("div");

    errorCard.className =
      "result-card";


    const errorTitle =
      document.createElement("h3");

    errorTitle.textContent =
      "⚠️ Search में समस्या";


    const errorText =
      document.createElement("p");

    errorText.textContent =
      error.message ||
      "Backend से response नहीं मिला।";


    errorCard.appendChild(
      errorTitle
    );

    errorCard.appendChild(
      errorText
    );


    results.appendChild(
      errorCard
    );

  } finally {

    searchBtn.disabled =
      false;

    searchBtn.textContent =
      "खोजें";
  }
}


// ========================================
// AI ANSWER
// ========================================

async function getAIAnswer(query) {

  // --------------------------------------
  // SHOW AI SECTION
  // --------------------------------------

  answerSection.classList.remove(
    "hidden"
  );


  directAnswer.textContent =
    "🤖 AI जवाब तैयार कर रहा है...";


  answerSource.textContent =
    "Search India AI";


  try {

    // ------------------------------------
    // AI REQUEST
    // ------------------------------------

    const response =
      await fetchWithTimeout(

        `${API_BASE}/api/ask`,

        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            query: query
          })
        },

        20000
      );


    // ------------------------------------
    // READ RESPONSE
    // ------------------------------------

    const text =
      await response.text();


    let data = {};

    try {

      data =
        text
          ? JSON.parse(text)
          : {};

    } catch {

      throw new Error(
        "AI API ने invalid response दिया।"
      );
    }


    // ------------------------------------
    // API ERROR
    // ------------------------------------

    if (!response.ok) {

      throw new Error(

        data?.detail ||
        data?.error ||
        `AI API Error: ${response.status}`

      );
    }


    // ------------------------------------
    // ANSWER
    // ------------------------------------

    const answer =
      String(
        data?.answer || ""
      ).trim();


    if (!answer) {

      throw new Error(
        "Gemini ने कोई उत्तर नहीं दिया।"
      );
    }


    // ------------------------------------
    // SHOW ANSWER
    // ------------------------------------

    directAnswer.textContent =
      answer;


    answerSource.textContent =
      "✨ Powered by Search India AI";


  } catch (error) {

    console.error(
      "AI error:",
      error
    );


    // ------------------------------------
    // TIMEOUT ERROR
    // ------------------------------------

    if (
      error.name ===
      "AbortError"
    ) {

      directAnswer.textContent =
        "⏱️ AI response आने में बहुत समय लग रहा है। कृपया फिर कोशिश करें।";

      answerSource.textContent =
        "Search India AI timeout";


      return;
    }


    // ------------------------------------
    // OTHER ERROR
    // ------------------------------------

    directAnswer.textContent =
      "❌ AI उत्तर नहीं मिल पाया।";


    answerSource.textContent =
      error.message ||
      "Search India AI error";

  }
}


// ========================================
// FETCH WITH TIMEOUT
// ========================================

async function fetchWithTimeout(
  url,
  options = {},
  timeout = 15000
) {

  const controller =
    new AbortController();


  const timeoutId =
    setTimeout(
      () => {
        controller.abort();
      },
      timeout
    );


  try {

    const response =
      await fetch(
        url,
        {
          ...options,
          signal:
            controller.signal
        }
      );


    return response;

  } finally {

    clearTimeout(
      timeoutId
    );

  }
}


// ========================================
// END
// ========================================
