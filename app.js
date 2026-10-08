const API_BASE = window.location.origin;

// ===============================
// ELEMENTS
// ===============================

const searchInput = document.getElementById("searchInput");
const searchForm = document.getElementById("searchForm");
const searchSection = document.getElementById("searchSection");
const searchStatus = document.getElementById("searchStatus");
const results = document.getElementById("results");

const answerBox = document.getElementById("answerBox");
const directAnswer = document.getElementById("directAnswer");
const answerSource = document.getElementById("answerSource");

const newsGrid = document.getElementById("newsGrid");

const micBtn = document.getElementById("micBtn");
const cameraBtn = document.getElementById("cameraBtn");
const imageInput = document.getElementById("imageInput");

const homeBtn = document.getElementById("homeBtn");
const historyList = document.getElementById("historyList");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");

const HISTORY_KEY = "searchIndiaHistory";

let selectedImage = null;
let isSearching = false;


// ===============================
// HTML ESCAPE
// ===============================

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


// ===============================
// SEARCH HISTORY
// ===============================

function getSearchHistory() {
  try {
    return JSON.parse(
      localStorage.getItem(HISTORY_KEY) || "[]"
    );
  } catch {
    return [];
  }
}


function saveSearchHistory(query) {
  query = String(query || "").trim();

  if (!query) return;

  let history = getSearchHistory();

  // Same search ko dobara upar lao
  history = history.filter(
    item => item.toLowerCase() !== query.toLowerCase()
  );

  history.unshift(query);

  // Maximum 20 searches
  history = history.slice(0, 20);

  localStorage.setItem(
    HISTORY_KEY,
    JSON.stringify(history)
  );

  renderSearchHistory();
}


function deleteSearchHistory(index) {
  const history = getSearchHistory();

  history.splice(index, 1);

  localStorage.setItem(
    HISTORY_KEY,
    JSON.stringify(history)
  );

  renderSearchHistory();
}


function renderSearchHistory() {
  if (!historyList) return;

  const history = getSearchHistory();

  if (history.length === 0) {
    historyList.innerHTML = `
      <div class="empty-history">
        🕘 अभी कोई search history नहीं है।
      </div>
    `;

    if (clearHistoryBtn) {
      clearHistoryBtn.style.display = "none";
    }

    return;
  }

  if (clearHistoryBtn) {
    clearHistoryBtn.style.display = "block";
  }

  historyList.innerHTML = history
    .map((item, index) => `
      <div class="history-item">

        <button
          class="history-search"
          type="button"
          data-history-index="${index}"
        >
          🔎 ${escapeHtml(item)}
        </button>

        <button
          class="history-delete"
          type="button"
          data-delete-index="${index}"
          aria-label="Delete search"
        >
          🗑️
        </button>

      </div>
    `)
    .join("");

  // History search buttons
  document
    .querySelectorAll("[data-history-index]")
    .forEach(button => {

      button.addEventListener("click", () => {

        const index = Number(
          button.dataset.historyIndex
        );

        const selected =
          getSearchHistory()[index];

        if (!selected) return;

        searchInput.value = selected;

        performSearch(selected);
      });

    });


  // Delete buttons
  document
    .querySelectorAll("[data-delete-index]")
    .forEach(button => {

      button.addEventListener("click", event => {

        event.stopPropagation();

        const index = Number(
          button.dataset.deleteIndex
        );

        deleteSearchHistory(index);
      });

    });
}


// Clear all history
if (clearHistoryBtn) {

  clearHistoryBtn.addEventListener(
    "click",
    () => {

      localStorage.removeItem(
        HISTORY_KEY
      );

      renderSearchHistory();

    }
  );

}


// ===============================
// HOME BUTTON
// ===============================

if (homeBtn) {

  homeBtn.addEventListener(
    "click",
    () => {

      // Search box clear
      if (searchInput) {
        searchInput.value = "";
      }

      // Image clear
      selectedImage = null;

      if (imageInput) {
        imageInput.value = "";
      }

      // Results clear
      if (results) {
        results.innerHTML = "";
      }

      // AI answer reset
      if (directAnswer) {
        directAnswer.textContent =
          "यहाँ आपके सवाल का जवाब दिखाई देगा।";
      }

      if (answerSource) {
        answerSource.textContent = "";
      }

      // Status reset
      if (searchStatus) {
        searchStatus.textContent = "";
      }

      // Image preview remove
      const imagePreview =
        document.getElementById("imagePreview");

      if (imagePreview) {
        imagePreview.innerHTML = "";
        imagePreview.style.display = "none";
      }

      // Search section top
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });

    }
  );

}


// ===============================
// IMAGE COMPRESSION
// ===============================

function compressImage(file) {

  return new Promise((resolve, reject) => {

    const reader = new FileReader();

    reader.onload = event => {

      const img = new Image();

      img.onload = () => {

        const maxSize = 1600;

        let width = img.width;
        let height = img.height;

        if (width > maxSize || height > maxSize) {

          if (width > height) {
            height =
              Math.round(
                height * maxSize / width
              );

            width = maxSize;

          } else {

            width =
              Math.round(
                width * maxSize / height
              );

            height = maxSize;

          }

        }

        const canvas =
          document.createElement("canvas");

        canvas.width = width;
        canvas.height = height;

        const ctx =
          canvas.getContext("2d");

        ctx.drawImage(
          img,
          0,
          0,
          width,
          height
        );

        const compressed =
          canvas.toDataURL(
            "image/jpeg",
            0.78
          );

        resolve(compressed);

      };

      img.onerror = reject;

      img.src = event.target.result;

    };

    reader.onerror = reject;

    reader.readAsDataURL(file);

  });

}


// ===============================
// IMAGE PREVIEW
// ===============================

function showImagePreview(dataUrl) {

  let preview =
    document.getElementById("imagePreview");

  if (!preview) {

    preview =
      document.createElement("div");

    preview.id = "imagePreview";

    if (searchForm) {
      searchForm.insertAdjacentElement(
        "afterend",
        preview
      );
    }

  }

  preview.style.display = "block";

  preview.innerHTML = `
    <div style="
      margin-top:10px;
      padding:10px;
      border-radius:14px;
      background:#f5f5f5;
      display:flex;
      align-items:center;
      gap:10px;
    ">

      <img
        src="${dataUrl}"
        alt="Selected image"
        style="
          width:70px;
          height:70px;
          object-fit:cover;
          border-radius:10px;
        "
      >

      <span style="flex:1;">
        📷 Image selected
      </span>

      <button
        id="removeImageBtn"
        type="button"
        style="
          border:none;
          background:#ffe5e5;
          padding:8px 10px;
          border-radius:10px;
          cursor:pointer;
        "
      >
        ✕
      </button>

    </div>
  `;

  const removeBtn =
    document.getElementById(
      "removeImageBtn"
    );

  if (removeBtn) {

    removeBtn.onclick = () => {

      selectedImage = null;

      if (imageInput) {
        imageInput.value = "";
      }

      preview.innerHTML = "";
      preview.style.display = "none";

    };

  }

}


// ===============================
// CAMERA / GALLERY
// ===============================

if (cameraBtn) {

  cameraBtn.addEventListener(
    "click",
    () => {

      if (imageInput) {
        imageInput.click();
      }

    }
  );

}


if (imageInput) {

  imageInput.addEventListener(
    "change",
    async event => {

      const file =
        event.target.files?.[0];

      if (!file) return;

      if (!file.type.startsWith("image/")) {
        return;
      }

      try {

        searchStatus.textContent =
          "📷 Image तैयार हो रही है...";

        selectedImage =
          await compressImage(file);

        showImagePreview(
          selectedImage
        );

        searchStatus.textContent =
          "📷 Image तैयार है। अब Search दबाएँ।";

      } catch (error) {

        console.error(error);

        searchStatus.textContent =
          "⚠️ Image load नहीं हो पाई।";

      }

    }
  );

}


// ===============================
// AI SEARCH
// ===============================

async function askAI(query, image = null) {

  try {

    const response =
      await fetch(
        `${API_BASE}/api/ask`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            query: query,
            image: image
          })
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error ||
        "AI request failed"
      );
    }

    if (
      !data?.answer
    ) {
      throw new Error(
        "AI answer empty"
      );
    }

    if (directAnswer) {

      directAnswer.textContent =
        data.answer;

    }

    if (answerSource) {

      answerSource.textContent =
        `⚡ ${data.model || "Google Gemini"}`;

    }

    return data;

  } catch (error) {

    console.error(
      "AI error:",
      error
    );

    if (directAnswer) {

      directAnswer.textContent =
        "⚠️ अभी AI उत्तर नहीं मिल पाया। थोड़ी देर बाद फिर try करें।";

    }

    if (answerSource) {
      answerSource.textContent = "";
    }

    return null;
  }

}


// ===============================
// WEB SEARCH
// ===============================

async function webSearch(query) {

  try {

    const response =
      await fetch(
        `${API_BASE}/api/search?q=${encodeURIComponent(query)}`
      );

    const data =
      await response.json();

    if (!response.ok) {

      throw new Error(
        data?.error ||
        "Web search failed"
      );

    }

    return data;

  } catch (error) {

    console.error(
      "Web search error:",
      error
    );

    return {
      results: [],
      error: error.message
    };

  }

}


// ===============================
// RESULT CARD
// ===============================

function makeCard(item) {

  const card =
    document.createElement("div");

  card.className =
    "result-card";

  const title =
    escapeHtml(
      item?.title ||
      "Untitled"
    );

  const snippet =
    escapeHtml(
      item?.snippet ||
      item?.content ||
      "इस website से जानकारी उपलब्ध है।"
    );

  const url =
    String(
      item?.url || ""
    );

  card.innerHTML = `
    <a
      href="${escapeHtml(url)}"
      target="_blank"
      rel="noopener noreferrer"
      class="result-link"
    >

      <h3>${title}</h3>

      <p>${snippet}</p>

      <small>
        ${escapeHtml(url)}
      </small>

    </a>
  `;

  return card;
}


// ===============================
// SHOW WEB RESULTS
// ===============================

function showWebResults(data) {

  if (!results) return;

  results.innerHTML = "";

  const list =
    Array.isArray(data?.results)
      ? data.results
      : [];

  if (list.length === 0) {

    results.innerHTML = `
      <div class="empty-history">
        🌐 कोई web result नहीं मिला।
      </div>
    `;

    return;
  }

  list.forEach(item => {

    results.appendChild(
      makeCard(item)
    );

  });

}


// ===============================
// MAIN SEARCH
// ===============================

async function performSearch(query) {

  query =
    String(query || "").trim();

  if (
    !query &&
    !selectedImage
  ) {
    return;
  }

  if (isSearching) {
    return;
  }

  isSearching = true;

  // Save only text searches
  if (query) {
    saveSearchHistory(query);
  }

  // Show loading
  if (searchStatus) {

    searchStatus.textContent =
      "🔎 Search India खोज रहा है...";

  }

  if (directAnswer) {

    directAnswer.textContent =
      "⏳ जग्गा जासूस जवाब तैयार कर रहा है...";

  }

  if (answerSource) {
    answerSource.textContent = "";
  }

  if (results) {
    results.innerHTML = `
      <div class="empty-history">
        🌐 Web results लोड हो रहे हैं...
      </div>
    `;
  }

  try {

    // AI + Web search simultaneously
    const aiPromise =
      askAI(
        query,
        selectedImage
      );

    const webPromise =
      query
        ? webSearch(query)
        : Promise.resolve({
            results: []
          });

    const [
      aiData,
      webData
    ] =
      await Promise.all([
        aiPromise,
        webPromise
      ]);

    // Web results
    showWebResults(
      webData
    );

    if (searchStatus) {

      if (
        aiData ||
        webData?.results?.length
      ) {

        searchStatus.textContent =
          "✅ Search complete";

      } else {

        searchStatus.textContent =
          "⚠️ कोई result नहीं मिला।";

      }

    }

  } catch (error) {

    console.error(
      "Search error:",
      error
    );

    if (searchStatus) {

      searchStatus.textContent =
        "⚠️ Search में समस्या आई।";

    }

  } finally {

    isSearching = false;

  }

}


// ===============================
// SEARCH FORM
// ===============================

if (searchForm) {

  searchForm.addEventListener(
    "submit",
    event => {

      event.preventDefault();

      const query =
        searchInput.value.trim();

      performSearch(query);

    }
  );

}


// ===============================
// ENTER KEY
// ===============================

if (searchInput) {

  searchInput.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Enter"
      ) {

        event.preventDefault();

        searchForm.requestSubmit();

      }

    }
  );

}


// ===============================
// VOICE SEARCH
// ===============================

if (micBtn) {

  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SpeechRecognition) {

    micBtn.addEventListener(
      "click",
      () => {

        alert(
          "आपके browser में Voice Search support नहीं है। Chrome में try करें।"
        );

      }
    );

  } else {

    const recognition =
      new SpeechRecognition();

    recognition.lang =
      "hi-IN";

    recognition.continuous =
      false;

    recognition.interimResults =
      false;

    micBtn.addEventListener(
      "click",
      () => {

        try {

          recognition.start();

          micBtn.textContent =
            "🔴";

          if (searchStatus) {

            searchStatus.textContent =
              "🎤 सुन रहा हूँ...";

          }

        } catch (error) {

          console.log(error);

        }

      }
    );


    recognition.onresult =
      event => {

        const transcript =
          event.results?.[0]?.[0]?.transcript ||
          "";

        searchInput.value =
          transcript;

        micBtn.textContent =
          "🎤";

        performSearch(
          transcript
        );

      };


    recognition.onerror =
      () => {

        micBtn.textContent =
          "🎤";

        if (searchStatus) {

          searchStatus.textContent =
            "⚠️ Voice Search शुरू नहीं हो पाई।";

        }

      };


    recognition.onend =
      () => {

        micBtn.textContent =
          "🎤";

      };

  }

}


// ===============================
// QUICK SEARCH LINKS
// ===============================

document
  .querySelectorAll(
    "[data-search]"
  )
  .forEach(button => {

    button.addEventListener(
      "click",
      event => {

        event.preventDefault();

        const query =
          button.dataset.search;

        if (!query) return;

        searchInput.value =
          query;

        performSearch(
          query
        );

      }
    );

  });


// ===============================
// PAGE LOAD
// ===============================

renderSearchHistory();
