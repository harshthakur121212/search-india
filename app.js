// ========================================
// SEARCH INDIA - APP.JS
// ========================================

// Your Vercel backend
const API_BASE = "https://search-india.vercel.app";


// ========================================
// ELEMENTS
// ========================================

const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");

const searchSection = document.getElementById("searchSection");
const searchStatus = document.getElementById("searchStatus");
const results = document.getElementById("results");

const answerSection = document.getElementById("answerSection");
const directAnswer = document.getElementById("directAnswer");
const answerSource = document.getElementById("answerSource");


// ========================================
// SEARCH FORM
// ========================================

searchForm.addEventListener("submit", async function (event) {

  event.preventDefault();

  const query = searchInput.value.trim();

  if (!query) {
    searchInput.focus();
    return;
  }

  await performSearch(query);

});


// ========================================
// QUICK SEARCH BUTTONS
// ========================================

document.querySelectorAll("[data-query]").forEach((button) => {

  button.addEventListener("click", async () => {

    const query = button.dataset.query;

    searchInput.value = query;

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

    await performSearch(query);

  });

});


// ========================================
// MAIN SEARCH
// ========================================

async function performSearch(query) {

  searchBtn.disabled = true;

  searchBtn.textContent = "खोज रहे हैं...";

  searchStatus.textContent = `🔎 "${query}" खोजा जा रहा है...`;

  results.replaceChildren();

  searchSection.classList.remove("hidden");

  answerSection.classList.add("hidden");


  try {

    // -----------------------------
    // 1. WEB SEARCH
    // -----------------------------

    const searchUrl =
      `${API_BASE}/api/search?q=${encodeURIComponent(query)}`;

    const searchResponse = await fetch(searchUrl);

    if (!searchResponse.ok) {

      throw new Error(
        `Search API Error: ${searchResponse.status}`
      );

    }

    const searchData = await searchResponse.json();

    const searchResults =
      Array.isArray(searchData.results)
        ? searchData.results
        : [];


    // -----------------------------
    // SHOW SEARCH RESULTS
    // -----------------------------

    if (searchResults.length === 0) {

      const empty = document.createElement("div");

      empty.className = "result-card";

      empty.innerHTML = `
        <h3>कोई परिणाम नहीं मिला</h3>
        <p>
          इस विषय पर अभी कोई परिणाम उपलब्ध नहीं है।
          दूसरा शब्द इस्तेमाल करके फिर खोजें।
        </p>
      `;

      results.appendChild(empty);

    } else {

      searchResults.forEach((item) => {

        const card = document.createElement("article");

        card.className = "result-card";


        const title = document.createElement("h3");

        const link = document.createElement("a");

        link.href = item.url || "#";

        link.target = "_blank";

        link.rel = "noopener noreferrer";

        link.textContent =
          item.title || "Search Result";


        title.appendChild(link);


        const snippet = document.createElement("p");

        snippet.textContent =
          item.snippet || "इस परिणाम की जानकारी उपलब्ध है।";


        card.appendChild(title);

        card.appendChild(snippet);

        results.appendChild(card);

      });

    }


    // -----------------------------
    // 2. AI ANSWER
    // -----------------------------

    await getAIAnswer(query);


    searchStatus.textContent =
      `✅ "${query}" के परिणाम मिल गए।`;


  } catch (error) {

    console.error("Search error:", error);

    searchStatus.textContent =
      "❌ Search API में समस्या आई। थोड़ी देर बाद फिर कोशिश करें।";


    results.replaceChildren();


    const errorCard = document.createElement("div");

    errorCard.className = "result-card";

    errorCard.innerHTML = `
      <h3>⚠️ Search में समस्या</h3>
      <p>
        Backend से response नहीं मिला।
        कृपया Vercel deployment और API endpoint check करें।
      </p>
    `;

    results.appendChild(errorCard);

  } finally {

    searchBtn.disabled = false;

    searchBtn.textContent = "खोजें";

  }

}


// ========================================
// AI ANSWER
// ========================================

async function getAIAnswer(query) {

  answerSection.classList.remove("hidden");

  directAnswer.textContent = "🤖 AI जवाब तैयार कर रहा है...";

  answerSource.textContent =
    "Search India AI";


  try {

    const response = await fetch(
      `${API_BASE}/api/ask`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          query: query
        })
      }
    );


    const data = await response.json();


    if (!response.ok) {

      throw new Error(
        data.error || "AI API failed"
      );

    }


    const answer =
      data.answer ||
      "अभी AI जवाब उपलब्ध नहीं है।";


    directAnswer.textContent = answer;

    answerSource.textContent =
      "✨ Powered by Search India AI";


  } catch (error) {

    console.error("AI error:", error);

    directAnswer.textContent =
      "AI उत्तर अभी उपलब्ध नहीं है। Search Results ऊपर दिए गए हैं।";

    answerSource.textContent =
      "Search India";


  }

}
