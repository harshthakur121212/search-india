
const API_BASE = window.location.origin;

const searchInput = document.getElementById("searchInput");
const searchForm = document.getElementById("searchForm");
const searchStatus = document.getElementById("searchStatus");
const results = document.getElementById("results");
const directAnswer = document.getElementById("directAnswer");
const answerSource = document.getElementById("answerSource");
const micBtn = document.getElementById("micBtn");
const cameraBtn = document.getElementById("cameraBtn");
const imageInput = document.getElementById("imageInput");
const homeBtn = document.getElementById("homeBtn");
const historyList = document.getElementById("historyList");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const historySection = document.getElementById("historySection");
const homeContent = document.getElementById("homeContent");
const accountBtn = document.getElementById("accountBtn");
const accountMenu = document.getElementById("accountMenu");

const HISTORY_KEY = "searchIndiaHistory";
let selectedImage = null;
let isSearching = false;

// Browser ka local timezone detect karein.
// Agar detect na ho, to India Standard Time use hoga.
function getUserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ||
      "Asia/Kolkata";
  } catch {
    return "Asia/Kolkata";
  }
}

function getLocalDateTime() {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: getUserTimeZone(),
      dateStyle: "full",
      timeStyle: "long"
    }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "full",
      timeStyle: "long"
    }).format(new Date());
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getSearchHistory() {
  try {
    const items = JSON.parse(
      localStorage.getItem(HISTORY_KEY) || "[]"
    );

    if (!Array.isArray(items)) return [];

    return items.map(item => {
      if (typeof item === "string") {
        return { query: item, timestamp: null };
      }

      return {
        query: String(item?.query || ""),
        timestamp: Number.isFinite(item?.timestamp)
          ? item.timestamp
          : null
      };
    }).filter(item => item.query.trim());
  } catch {
    return [];
  }
}

function writeSearchHistory(history) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error("History save error:", error);
  }
}

function saveSearchHistory(query) {
  query = String(query || "").trim();
  if (!query) return;

  const history = getSearchHistory().filter(
    item => item.query.toLowerCase() !== query.toLowerCase()
  );

  history.unshift({ query, timestamp: Date.now() });
  writeSearchHistory(history.slice(0, 100));
  renderSearchHistory();
}

function deleteSearchHistory(index) {
  const history = getSearchHistory();
  history.splice(index, 1);
  writeSearchHistory(history);
  renderSearchHistory();
}

function renderSearchHistory() {
  if (!historyList) return;

  const history = getSearchHistory();

  if (!history.length) {
    historyList.innerHTML =
      '<div class="empty-history">🕘 अभी कोई search history नहीं है।</div>';

    if (clearHistoryBtn) clearHistoryBtn.style.display = "none";
    return;
  }

  if (clearHistoryBtn) clearHistoryBtn.style.display = "block";

  historyList.innerHTML = history.map((item, index) => {
    const timeLabel = item.timestamp
      ? new Date(item.timestamp).toLocaleString()
      : "पुरानी entry — समय उपलब्ध नहीं";

    return `
      <div class="history-item">
        <button class="history-search" type="button"
          data-history-index="${index}">
          <span>🔎 ${escapeHtml(item.query)}</span>
          <small>${escapeHtml(timeLabel)}</small>
        </button>
        <button class="history-delete" type="button"
          data-delete-index="${index}"
          aria-label="Delete search">🗑️</button>
      </div>`;
  }).join("");

  historyList.querySelectorAll("[data-history-index]").forEach(button => {
    button.addEventListener("click", () => {
      const item = getSearchHistory()[
        Number(button.dataset.historyIndex)
      ];

      if (!item) return;
      if (searchInput) searchInput.value = item.query;

      showHome();
      performSearch(item.query);
    });
  });

  historyList.querySelectorAll("[data-delete-index]").forEach(button => {
    button.addEventListener("click", event => {
      event.stopPropagation();
      deleteSearchHistory(Number(button.dataset.deleteIndex));
    });
  });
}

function closeAccountMenu() {
  if (accountMenu) accountMenu.classList.add("hidden");

  if (accountBtn) {
    accountBtn.setAttribute("aria-expanded", "false");
  }
}

if (accountBtn && accountMenu) {
  accountBtn.addEventListener("click", event => {
    event.stopPropagation();

    const willOpen = accountMenu.classList.contains("hidden");
    accountMenu.classList.toggle("hidden", !willOpen);
    accountBtn.setAttribute("aria-expanded", String(willOpen));
  });

  accountMenu.addEventListener("click", event => event.stopPropagation());

  document.addEventListener("click", closeAccountMenu);
}

const addAccountBtn = document.getElementById("addAccountBtn");
const guestBtn = document.getElementById("guestBtn");
const openHistoryBtn = document.getElementById("openHistoryBtn");
const backFromHistoryBtn = document.getElementById("backFromHistoryBtn");
const delete15Btn = document.getElementById("delete15Btn");
const deleteAllBtn = document.getElementById("deleteAllBtn");

if (addAccountBtn) {
  addAccountBtn.addEventListener("click", () => {
    closeAccountMenu();

    alert(
      "Add account का वास्तविक login अभी सेट नहीं है। " +
      "इसके लिए सुरक्षित authentication setup करना होगा।"
    );
  });
}

if (guestBtn) {
  guestBtn.addEventListener("click", closeAccountMenu);
}

function showHistory() {
  closeAccountMenu();

  if (homeContent) homeContent.classList.add("hidden");

  document.querySelector(".useful-section")?.classList.add("hidden");

  if (historySection) historySection.classList.remove("hidden");

  renderSearchHistory();

  historySection?.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function showHome() {
  if (historySection) historySection.classList.add("hidden");
  if (homeContent) homeContent.classList.remove("hidden");

  document.querySelector(".useful-section")?.classList.remove("hidden");

  closeAccountMenu();
}

if (openHistoryBtn) {
  openHistoryBtn.addEventListener("click", showHistory);
}

if (backFromHistoryBtn) {
  backFromHistoryBtn.addEventListener("click", showHome);
}

if (delete15Btn) {
  delete15Btn.addEventListener("click", () => {
    if (!confirm("पिछले 15 मिनट की search history हटाएँ?")) return;

    const cutoff = Date.now() - 15 * 60 * 1000;

    const history = getSearchHistory().filter(item =>
      item.timestamp === null || item.timestamp < cutoff
    );

    writeSearchHistory(history);
    renderSearchHistory();
    closeAccountMenu();

    alert("पिछले 15 मिनट की समय वाली searches हटा दी गईं।");
  });
}

function clearAllHistory() {
  if (!confirm("क्या पूरी search history हटानी है?")) return;

  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch (error) {
    console.error(error);
  }

  renderSearchHistory();
  closeAccountMenu();
}

if (deleteAllBtn) {
  deleteAllBtn.addEventListener("click", clearAllHistory);
}

if (clearHistoryBtn) {
  clearHistoryBtn.addEventListener("click", clearAllHistory);
}

if (homeBtn) {
  homeBtn.addEventListener("click", () => {
    showHome();

    if (searchInput) searchInput.value = "";

    selectedImage = null;
    if (imageInput) imageInput.value = "";

    if (results) {
      results.innerHTML =
        '<div class="empty">🔎 कुछ खोजने के बाद web results यहाँ दिखाई देंगे।</div>';
    }

    if (directAnswer) {
      directAnswer.textContent =
        "यहाँ आपके सवाल का AI answer दिखाई देगा।";
    }

    if (answerSource) answerSource.textContent = "";

    if (searchStatus) {
      searchStatus.textContent = "";
      searchStatus.classList.add("hidden");
    }

    const previewBox = document.getElementById("imagePreviewBox");
    if (previewBox) previewBox.classList.add("hidden");

    const previewImage = document.getElementById("imagePreview");
    if (previewImage) previewImage.removeAttribute("src");

    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

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
            height = Math.round(height * maxSize / width);
            width = maxSize;
          } else {
            width = Math.round(width * maxSize / height);
            height = maxSize;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Image canvas unavailable"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };

      img.onerror = () => reject(new Error("Image could not be read"));
      img.src = event.target.result;
    };

    reader.onerror = () => reject(new Error("File could not be read"));
    reader.readAsDataURL(file);
  });
}

function showImagePreview(dataUrl) {
  const box = document.getElementById("imagePreviewBox");
  const img = document.getElementById("imagePreview");

  if (!box || !img) return;

  img.src = dataUrl;
  box.classList.remove("hidden");
}

if (cameraBtn && imageInput) {
  cameraBtn.addEventListener("click", () => imageInput.click());
}

const removeImageBtn = document.getElementById("removeImageBtn");

if (removeImageBtn) {
  removeImageBtn.addEventListener("click", () => {
    selectedImage = null;

    if (imageInput) imageInput.value = "";

    const box = document.getElementById("imagePreviewBox");
    const img = document.getElementById("imagePreview");

    if (box) box.classList.add("hidden");
    if (img) img.removeAttribute("src");
  });
}

if (imageInput) {
  imageInput.addEventListener("change", async event => {
    const file = event.target.files?.[0];

    if (!file || !file.type.startsWith("image/")) return;

    try {
      if (searchStatus) {
        searchStatus.classList.remove("hidden");
        searchStatus.textContent = "📷 फोटो तैयार हो रही है...";
      }

      selectedImage = await compressImage(file);
      showImagePreview(selectedImage);

      await performSearch(searchInput?.value.trim() || "");
    } catch (error) {
      console.error("Image error:", error);

      if (searchStatus) {
        searchStatus.classList.remove("hidden");
        searchStatus.textContent = "⚠️ फोटो पढ़ी नहीं जा सकी।";
      }
    }
  });
}

async function askAI(query, image = null) {
  try {
    const response = await fetch(`${API_BASE}/api/ask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query,
        image,
        timeZone: getUserTimeZone(),
        localDateTime: getLocalDateTime()
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.message || data?.error || "AI request failed"
      );
    }

    if (!data?.answer) {
      throw new Error("AI answer empty");
    }

    if (directAnswer) {
      directAnswer.textContent = data.answer;
    }

    if (answerSource) {
      answerSource.textContent =
        `⚡ ${data.source || data.model || "Search India AI"}`;
    }

    return data;
  } catch (error) {
    console.error("AI error:", error);

    if (directAnswer) {
      directAnswer.textContent =
        "⚠️ अभी AI उत्तर नहीं मिल पाया। थोड़ी देर बाद फिर try करें।";
    }

    if (answerSource) answerSource.textContent = "";

    return null;
  }
}

async function webSearch(query) {
  try {
    const response = await fetch(
      `${API_BASE}/api/search?q=${encodeURIComponent(query)}`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.message || data?.error || "Web search failed"
      );
    }

    return data;
  } catch (error) {
    console.error("Web search error:", error);

    return {
      results: [],
      error: error.message
    };
  }
}

function makeCard(item) {
  const card = document.createElement("div");
  card.className = "result-card";

  const title = escapeHtml(item?.title || "Untitled");

  const snippet = escapeHtml(
    item?.snippet ||
    item?.content ||
    "इस website से जानकारी उपलब्ध है।"
  );

  const url = String(item?.url || "");
  let safeUrl = "#";

  try {
    const parsed = new URL(url);

    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      safeUrl = parsed.href;
    }
  } catch {}

  card.innerHTML = `
    <a href="${escapeHtml(safeUrl)}" target="_blank"
      rel="noopener noreferrer" class="result-link">
      <h3>${title}</h3>
      <p>${snippet}</p>
      <small>${escapeHtml(url)}</small>
    </a>`;

  return card;
}

function showWebResults(data) {
  if (!results) return;

  results.innerHTML = "";

  const list = Array.isArray(data?.results) ? data.results : [];

  if (!list.length) {
    results.innerHTML =
      '<div class="empty">🌐 कोई web result नहीं मिला।</div>';
    return;
  }

  list.forEach(item => results.appendChild(makeCard(item)));
}

async function performSearch(query) {
  query = String(query || "").trim();

  if (!query && !selectedImage) return;
  if (isSearching) return;

  isSearching = true;

  if (query) saveSearchHistory(query);

  if (searchStatus) {
    searchStatus.classList.remove("hidden");
    searchStatus.textContent = "🔎 Search India खोज रहा है...";
  }

  if (directAnswer) {
    directAnswer.textContent = "⏳ AI जवाब तैयार कर रहा है...";
  }

  if (answerSource) answerSource.textContent = "";

  if (results) {
    results.innerHTML =
      '<div class="empty">🌐 Web results लोड हो रहे हैं...</div>';
  }

  try {
    const aiPromise = askAI(query, selectedImage);

    const webPromise = query
      ? webSearch(query)
      : Promise.resolve({ results: [] });

    const [aiData, webData] = await Promise.all([
      aiPromise,
      webPromise
    ]);

    showWebResults(webData);

    if (searchStatus) {
      searchStatus.textContent =
        aiData || webData?.results?.length
          ? "✅ Search complete"
          : "⚠️ कोई result नहीं मिला।";
    }
  } catch (error) {
    console.error("Search error:", error);

    if (searchStatus) {
      searchStatus.textContent = "⚠️ Search में समस्या आई।";
    }
  } finally {
    isSearching = false;
  }
}

if (searchForm) {
  searchForm.addEventListener("submit", event => {
    event.preventDefault();
    performSearch(searchInput?.value.trim() || "");
  });
}

if (micBtn) {
  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    micBtn.addEventListener("click", () => {
      alert(
        "आपके browser में Voice Search support नहीं है। Chrome में try करें।"
      );
    });
  } else {
    const recognition = new SpeechRecognition();

    recognition.lang = "hi-IN";
    recognition.continuous = false;
    recognition.interimResults = false;

    micBtn.addEventListener("click", () => {
      try {
        recognition.start();
        micBtn.textContent = "🔴";

        if (searchStatus) {
          searchStatus.classList.remove("hidden");
          searchStatus.textContent = "🎤 सुन रहा हूँ...";
        }
      } catch (error) {
        console.log(error);
      }
    });

    recognition.onresult = event => {
      const transcript =
        event.results?.[0]?.[0]?.transcript || "";

      if (searchInput) searchInput.value = transcript;

      micBtn.textContent = "🎤";
      performSearch(transcript);
    };

    recognition.onerror = () => {
      micBtn.textContent = "🎤";

      if (searchStatus) {
        searchStatus.classList.remove("hidden");
        searchStatus.textContent =
          "⚠️ Voice Search शुरू नहीं हो पाई।";
      }
    };

    recognition.onend = () => {
      micBtn.textContent = "🎤";
    };
  }
}

document.querySelectorAll("[data-search]").forEach(button => {
  button.addEventListener("click", event => {
    event.preventDefault();

    const query = button.dataset.search;
    if (!query) return;

    if (searchInput) searchInput.value = query;

    performSearch(query);
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
});

renderSearchHistory();

async function loadLiveNews() {
  const newsGrid = document.getElementById("newsGrid");
  const newsStatus = document.getElementById("newsStatus");
  const refreshBtn = document.getElementById("refreshNewsBtn");

  if (!newsGrid) return;

  if (refreshBtn) refreshBtn.disabled = true;

  if (newsStatus) {
    newsStatus.textContent = "📰 ताज़ा खबरें लोड हो रही हैं...";
  }

  try {
    const response = await fetch(`${API_BASE}/api/news`);
    const data = await response.json();

    if (!response.ok || !Array.isArray(data.news)) {
      throw new Error(data.error || "News load failed");
    }

    if (!data.news.length) {
      newsGrid.innerHTML =
        '<div class="empty">अभी खबरें उपलब्ध नहीं हैं। थोड़ी देर बाद Refresh करें।</div>';

      if (newsStatus) {
        newsStatus.textContent = "फिलहाल कोई खबर नहीं मिली।";
      }

      return;
    }

    newsGrid.innerHTML = "";

    data.news.forEach(article => {
      const card = document.createElement("article");
      card.className = "news-card";

      const link = document.createElement("a");
      link.className = "news-card-link";

      // Only allow HTTP(S) news links.
      try {
        const articleUrl = new URL(article.link);

        if (!["https:", "http:"].includes(articleUrl.protocol)) {
          return;
        }

        link.href = articleUrl.href;
      } catch {
        return;
      }

      link.target = "_blank";
      link.rel = "noopener noreferrer";

      if (article.image) {
        try {
          const imageUrl = new URL(article.image);

          if (["https:", "http:"].includes(imageUrl.protocol)) {
            const image = document.createElement("img");
            image.src = imageUrl.href;
            image.alt = article.title || "News image";
            image.loading = "lazy";
            image.referrerPolicy = "no-referrer";
            image.onerror = () => image.remove();
            link.appendChild(image);
          }
        } catch {}
      }

      const title = document.createElement("h3");
      title.textContent = article.title || "Untitled news";
      link.appendChild(title);

      if (article.description) {
        const description = document.createElement("p");
        description.textContent = article.description;
        link.appendChild(description);
      }

      const source = document.createElement("div");
      source.className = "news-source";
      source.textContent = article.source || "News source";
      link.appendChild(source);

      if (article.pubDate) {
        const date = document.createElement("small");
        const parsedDate = new Date(article.pubDate);

        date.textContent = Number.isNaN(parsedDate.getTime())
          ? article.pubDate
          : parsedDate.toLocaleString("hi-IN", {
              timeZone: getUserTimeZone()
            });

        link.appendChild(date);
      }

      card.appendChild(link);
      newsGrid.appendCh  
