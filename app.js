// ==========================================
// 🇮🇳 SEARCH INDIA
// APP.JS
// Voice + Camera + AI + Web Search
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

const micBtn =
  document.getElementById("micBtn");

const cameraBtn =
  document.getElementById("cameraBtn");

const imageInput =
  document.getElementById("imageInput");

const imagePreview =
  document.getElementById("imagePreview");

const imagePreviewBox =
  document.getElementById("imagePreviewBox");

const removeImageBtn =
  document.getElementById("removeImageBtn");

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
// SELECTED IMAGE
// ==========================================

let selectedImage = null;


// ==========================================
// TIMEOUT FETCH
// ==========================================

async function fetchWithTimeout(
  url,
  options = {},
  timeout = 35000
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
// HTML ESCAPE
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
    searchStatus.classList.add(type);
  }

}


// ==========================================
// LOADING
// ==========================================

function setLoading(
  loading
) {

  if (!searchBtn) return;

  searchBtn.disabled =
    loading;

  searchBtn.textContent =
    loading
      ? "⏳"
      : "🔎";

}


// ==========================================
// AI LOADING
// ==========================================

function showAILoading(
  message = "🤖 AI जवाब तैयार कर रहा है..."
) {

  answerSection?.classList.remove(
    "hidden"
  );

  if (directAnswer) {

    directAnswer.innerHTML =
      escapeHTML(message);

  }

  if (answerSource) {

    answerSource.textContent =
      "Search India AI";

  }

}


// ==========================================
// AI TEXT SEARCH
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
        "AI server response invalid"
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
        "AI ने कोई answer नहीं दिया"
      );

    }


    directAnswer.innerHTML =
      escapeHTML(answer)
        .replace(/\n/g, "<br>");


    answerSource.textContent =
      data?.model
        ? `Search India AI • ${data.model}`
        : "Search India AI";


    return data;

  } catch (error) {

    console.error(
      "AI ERROR:",
      error
    );

    directAnswer.innerHTML = `
      ⚠️ AI अभी जवाब नहीं दे पा रहा है।
      <br><br>
      कृपया थोड़ी देर बाद फिर कोशिश करें।
    `;

    answerSource.textContent =
      "Search India AI";

    return null;

  }

}


// ==========================================
// IMAGE → AI
// ==========================================

async function getAIImageAnswer(
  imageData,
  query = ""
) {

  answerSection?.classList.remove(
    "hidden"
  );

  directAnswer.innerHTML = `
    📷 Photo को AI पढ़ रहा है...
    <br><br>
    कृपया थोड़ा इंतजार करें।
  `;

  answerSource.textContent =
    "Search India Vision AI";


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

            query:
              query ||
              "इस photo में दिए गए question को पढ़कर उसका सही answer समझाइए।",

            image:
              imageData

          })

        },

        60000
      );


    const text =
      await response.text();

    let data;


    try {

      data =
        JSON.parse(text);

    } catch {

      throw new Error(
        "AI image response invalid"
      );

    }


    if (!response.ok) {

      throw new Error(
        data?.error ||
        data?.detail ||
        `Image AI Error ${response.status}`
      );

    }


    const answer =
      String(
        data?.answer || ""
      ).trim();


    if (!answer) {

      throw new Error(
        "Image AI ने answer नहीं दिया"
      );

    }


    directAnswer.innerHTML =
      escapeHTML(answer)
        .replace(/\n/g, "<br>");


    answerSource.textContent =
      data?.model
        ? `Search India Vision AI • ${data.model}`
        : "Search India Vision AI";


    return data;


  } catch (error) {

    console.error(
      "IMAGE AI ERROR:",
      error
    );


    directAnswer.innerHTML = `
      ⚠️ Photo को पढ़ने में समस्या हुई।
      <br><br>
      कृपया साफ photo लेकर फिर कोशिश करें।
    `;

    answerSource.textContent =
      "Search India Vision AI";


    return null;

  }

}


// ==========================================
// WEB RESULT CARD
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

    <h3>${title}</h3>

    <p>${snippet}</p>

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
    Array.isArray(data?.results)
      ? data.results
      : [];


  if (!items.length) {

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

  searchSection?.classList.remove(
    "hidden"
  );


  results.innerHTML = `

    <div class="result-card">

      <h3>
        🌐 Web Search
      </h3>

      <p>
        Web results खोजे जा रहे हैं...
      </p>

    </div>

  `;


  try {

    const response =
      await fetchWithTimeout(

        `${API_BASE}/api/search?q=` +
        encodeURIComponent(query),

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
        "Search response invalid"
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


    results.innerHTML = `

      <div class="result-card">

        <h3>
          ⚠️ Web Search में समस्या
        </h3>

        <p>
          Web results अभी उपलब्ध नहीं हैं।
        </p>

      </div>

    `;


    return null;

  }

}


// ==========================================
// NORMAL SEARCH
// ==========================================

async function performSearch(
  query
) {

  query =
    String(query || "").trim();


  if (!query) {

    setStatus(
      "कृपया कुछ खोजें।",
      "error"
    );

    searchInput?.focus();

    return;

  }


  setLoading(true);


  setStatus(
    `🔎 "${query}" खोजा जा रहा है...`
  );


  answerSection?.classList.remove(
    "hidden"
  );

  searchSection?.classList.remove(
    "hidden"
  );


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

}


// ==========================================
// IMAGE SEARCH
// ==========================================

async function performImageSearch(
  file
) {

  if (!file) return;


  setLoading(true);


  setStatus(
    "📷 Photo को पढ़ा जा रहा है..."
  );


  try {

    const reader =
      new FileReader();


    const imageData =
      await new Promise(
        (resolve, reject) => {

          reader.onload =
            () => resolve(
              reader.result
            );

          reader.onerror =
            reject;

          reader.readAsDataURL(file);

        }
      );


    selectedImage =
      imageData;


    imagePreview.src =
      imageData;


    imagePreviewBox.classList.remove(
      "hidden"
    );


    await getAIImageAnswer(
      imageData,
      searchInput?.value?.trim() || ""
    );


    setStatus(
      "✅ Photo का AI answer तैयार है।"
    );


  } catch (error) {

    console.error(
      "IMAGE ERROR:",
      error
    );


    setStatus(
      "⚠️ Photo process नहीं हो पाई।",
      "error"
    );

  }


  setLoading(false);

}


// ==========================================
// SEARCH FORM
// ==========================================

searchForm?.addEventListener(
  "submit",
  function(event) {

    event.preventDefault();
    event.stopPropagation();


    const query =
      searchInput?.value?.trim() || "";


    performSearch(query);

  }
);


// ==========================================
// CAMERA BUTTON
// ==========================================

cameraBtn?.addEventListener(
  "click",
  function() {

    imageInput?.click();

  }
);


// ==========================================
// IMAGE PICKED
// ==========================================

imageInput?.addEventListener(
  "change",
  function() {

    const file =
      this.files?.[0];


    if (file) {

      performImageSearch(file);

    }

  }
);


// ==========================================
// REMOVE IMAGE
// ==========================================

removeImageBtn?.addEventListener(
  "click",
  function() {

    selectedImage =
      null;

    imageInput.value =
      "";

    imagePreview.src =
      "";

    imagePreviewBox.classList.add(
      "hidden"
    );

    setStatus(
      "भारत में कुछ भी खोजें..."
    );

  }
);


// ==========================================
// MICROPHONE / VOICE SEARCH
// ==========================================

let recognition = null;


const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;


if (SpeechRecognition) {

  recognition =
    new SpeechRecognition();


  recognition.lang =
    "hi-IN";


  recognition.continuous =
    false;


  recognition.interimResults =
    false;


  recognition.onstart =
    function() {

      micBtn.textContent =
        "🔴";

      setStatus(
        "🎤 सुन रहा हूँ..."
      );

    };


  recognition.onresult =
    function(event) {

      const transcript =
        event.results?.[0]?.[0]?.transcript || "";


      searchInput.value =
        transcript;


      setStatus(
        `🎤 "${transcript}" सुना गया।`
      );


      performSearch(
        transcript
      );

    };


  recognition.onerror =
    function(event) {

      console.error(
        "Voice error:",
        event
      );


      setStatus(
        "🎤 Mic काम नहीं कर पाया।",
        "error"
      );

    };


  recognition.onend =
    function() {

      micBtn.textContent =
        "🎤";

    };


  micBtn?.addEventListener(
    "click",
    function() {

      try {

        recognition.start();

      } catch {

        // Already running

      }

    }
  );


} else {

  micBtn?.addEventListener(
    "click",
    function() {

      setStatus(
        "यह browser Voice Search support नहीं करता।",
        "error"
      );

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


          searchInput.value =
            query;


          performSearch(
            query
          );

        }
      );

    }
  );


// ==========================================
// ENTER KEY
// ==========================================

searchInput?.addEventListener(
  "keydown",
  function(event) {

    if (
      event.key === "Enter"
    ) {

      event.preventDefault();

      searchForm?.requestSubmit();

    }

  }
);


// ==========================================
// START
// ==========================================

setStatus(
  "भारत में कुछ भी खोजें..."
);


console.log(
  "🇮🇳 Search India loaded"
);
