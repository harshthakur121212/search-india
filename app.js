// ==========================================
// 🇮🇳 SEARCH INDIA
// MAIN APP.JS
// ==========================================


// ==========================================
// API
// ==========================================

const API_BASE = window.location.origin;


// ==========================================
// ELEMENTS
// ==========================================

const searchForm =
  document.getElementById("searchForm");

const searchInput =
  document.getElementById("searchInput");

const searchBtn =
  document.getElementById("searchBtn");

const searchStatus =
  document.getElementById("searchStatus");

const searchSection =
  document.getElementById("searchSection");

const results =
  document.getElementById("results");

const answerSection =
  document.getElementById("answerSection");

const directAnswer =
  document.getElementById("directAnswer");

const answerSource =
  document.getElementById("answerSource");


// ==========================================
// TIMEOUT FETCH
// ==========================================

async function fetchWithTimeout(
  url,
  options = {},
  timeout = 30000
) {

  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () => controller.abort(),
      timeout
    );

  try {

    return await fetch(
      url,
      {
        ...options,
        signal: controller.signal
      }
    );

  } finally {

    clearTimeout(timer);

  }

}


// ==========================================
// HTML SECURITY
// ==========================================

function escapeHTML(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


// ==========================================
// STATUS
// ==========================================

function setStatus(
  message,
  type = ""
) {

  if (!searchStatus) return;

  searchStatus.textContent =
    message;

  searchStatus.className =
    "status";

  if (type) {

    searchStatus.classList.add(
      type
    );

  }

}


// ==========================================
// BUTTON LOADING
// ==========================================

function setLoading(
  loading
) {

  if (!searchBtn) return;

  if (loading) {

    searchBtn.disabled = true;

    searchBtn.textContent =
      "खोज रहे हैं...";

  } else {

    searchBtn.disabled = false;

    searchBtn.textContent =
      "खोजें";

  }

}


// ==========================================
// AI LOADING
// ==========================================

function showAILoading() {

  if (!answerSection) return;

  answerSection.classList.remove(
    "hidden"
  );

  if (directAnswer) {

    directAnswer.innerHTML = `
      <div>
        🤖 AI जवाब तैयार कर रहा है...
      </div>
    `;

  }

  if (answerSource) {

    answerSource.textContent =
      "Search India AI";

  }

}


// ==========================================
// AI SEARCH
// ==========================================

async function getAIAnswer(
  query
) {

  showAILoading();

  try {

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

        35000

      );


    const text =
      await response.text();


    let data;


    try {

      data =
        JSON.parse(text);

    } catch {

      throw new Error(
        "AI server का response सही नहीं है।"
      );

    }


    if (!response.ok) {

      throw new Error(

        data?.error ||
        data?.detail ||
        `AI Error ${response.status}`

      );

    }


    const answer =
      String(
        data?.answer || ""
      ).trim();


    if (!answer) {

      throw new Error(
        "AI ने खाली उत्तर दिया।"
      );

    }


    if (answerSection) {

      answerSection.classList.remove(
        "hidden"
      );

    }


    if (directAnswer) {

      directAnswer.innerHTML =

        escapeHTML(answer)
          .replace(/\n/g, "<br>");

    }


    if (answerSource) {

      answerSource.textContent =

        data?.model
          ? `Search India AI • ${data.model}`
          : "Search India AI";

    }


    return data;


  } catch (error) {

    console.error(
      "AI ERROR:",
      error
    );


    if (answerSection) {

      answerSection.classList.remove(
        "hidden"
      );

    }


    if (directAnswer) {

      if (
        error.name ===
        "AbortError"
      ) {

        directAnswer.innerHTML = `
          ⚠️ AI response में ज्यादा समय लग रहा है।
          <br><br>
          कृपया थोड़ी देर बाद फिर कोशिश करें।
        `;

      } else {

        directAnswer.innerHTML = `
          ⚠️ AI अभी जवाब नहीं दे पा रहा है।
          <br><br>
          Web Search नीचे उपलब्ध हो सकता है।
        `;

      }

    }


    if (answerSource) {

      answerSource.textContent =
        "Search India AI";

    }


    return null;

  }

}


// ==========================================
// RESULT CARD
// ==========================================

function makeResultCard(
  item
) {

  const card =
    document.createElement(
      "article"
    );

  card.className =
    "result-card";


  const title =
    escapeHTML(
      item?.title ||
      "Untitled"
    );


  const snippet =
    escapeHTML(
      item?.snippet ||
      item?.content ||
      "जानकारी उपलब्ध नहीं है।"
    );


  const url =
    String(
      item?.url || ""
    );


  let linkHTML = "";


  if (
    url &&
    /^https?:\/\//i.test(url)
  ) {

    linkHTML = `

      <a
        href="${escapeHTML(url)}"
        target="_blank"
        rel="noopener noreferrer"
      >
        परिणाम खोलें →
      </a>

    `;

  }


  card.innerHTML = `

    <h3>
      ${title}
    </h3>

    <p>
      ${snippet}
    </p>

    ${linkHTML}

  `;


  return card;

}


// ==========================================
// SHOW RESULTS
// ==========================================

function showResults(
  data
) {

  if (!results) return;


  results.innerHTML = "";


  const items =
    Array.isArray(
      data?.results
    )
      ? data.results
      : [];


  if (
    items.length === 0
  ) {

    results.innerHTML = `

      <div class="result-card">

        <h3>
          🔎 कोई Web Result नहीं मिला
        </h3>

        <p>
          दूसरे शब्दों में खोजकर देखें।
        </p>

      </div>

    `;

    return;

  }


  items.forEach(
    item => {

      results.appendChild(
        makeResultCard(item)
      );

    }
  );

}


// ==========================================
// WEB SEARCH
// ==========================================

async function searchWeb(
  query
) {

  if (!searchSection) {
    return null;
  }


  searchSection.classList.remove(
    "hidden"
  );


  if (results) {

    results.innerHTML = `

      <div class="result-card">

        <h3>
          🔎 Web Search
        </h3>

        <p>
          Web results खोजे जा रहे हैं...
        </p>

      </div>

    `;

  }


  try {

    const url =
      `${API_BASE}/api/search?q=` +
      encodeURIComponent(query);


    const response =
      await fetchWithTimeout(

        url,

        {
          method: "GET"
        },

        20000

      );


    const text =
      await response.text();


    let data;


    try {

      data =
        JSON.parse(text);

    } catch {

      throw new Error(
        "Search server का response सही नहीं है।"
      );

    }


    if (!response.ok) {

      throw new Error(

        data?.error ||
        `Search Error ${response.status}`

      );

    }


    showResults(data);


    return data;


  } catch (error) {

    console.error(
      "WEB SEARCH ERROR:",
      error
    );


    if (results) {

      results.innerHTML = `

        <div class="result-card">

          <h3>
            ⚠️ Web Search में समस्या
          </h3>

          <p>
            अभी Web results लोड नहीं हो पाए।
            AI answer उपलब्ध हो सकता है।
          </p>

        </div>

      `;

    }


    return null;

  }

}


// ==========================================
// MAIN SEARCH
// ==========================================

async function performSearch(
  query
) {

  query =
    String(query || "")
      .trim();


  if (!query) {

    setStatus(
      "कृपया कुछ खोजें।",
      "error"
    );

    if (searchInput) {

      searchInput.focus();

    }

    return;

  }


  // IMPORTANT:
  // Page reload नहीं होगा

  setLoading(true);


  setStatus(
    `🔎 "${query}" खोजा जा रहा है...`
  );


  if (answerSection) {

    answerSection.classList.remove(
      "hidden"
    );

  }


  if (searchSection) {

    searchSection.classList.remove(
      "hidden"
    );

  }


  // AI और Web Search साथ-साथ

  const aiPromise =
    getAIAnswer(query);

  const webPromise =
    searchWeb(query);


  await Promise.allSettled([
    aiPromise,
    webPromise
  ]);


  setStatus(
    `✅ "${query}" के परिणाम मिल गए।`
  );


  setLoading(false);


  // Results पर scroll

  if (answerSection) {

    answerSection.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  }

}


// ==========================================
// FORM SUBMIT
// ==========================================

if (searchForm) {

  searchForm.addEventListener(
    "submit",
    function(event) {

      // VERY IMPORTANT
      // Browser reload रोकना

      event.preventDefault();

      event.stopPropagation();


      const query =
        searchInput
          ? searchInput.value.trim()
          : "";


      performSearch(query);

    }
  );

}


// ==========================================
// QUICK SEARCH
// ==========================================

document
  .querySelectorAll(
    "[data-query]"
  )
  .forEach(
    button => {

      button.addEventListener(
        "click",
        function(event) {

          event.preventDefault();


          const query =
            this.getAttribute(
              "data-query"
            ) || "";


          if (searchInput) {

            searchInput.value =
              query;

          }


          performSearch(query);

        }
      );

    }
  );


// ==========================================
// ENTER KEY
// ==========================================

if (searchInput) {

  searchInput.addEventListener(
    "keydown",
    function(event) {

      if (
        event.key === "Enter"
      ) {

        event.preventDefault();

        if (searchForm) {

          searchForm.requestSubmit();

        }

      }

    }
  );

}


// ==========================================
// INITIAL MESSAGE
// ==========================================

setStatus(
  "भारत में कुछ भी खोजें..."
);


console.log(
  "🇮🇳 Search India loaded successfully"
);
