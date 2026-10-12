
"use strict";

// ========================================
// SEARCH INDIA 🇮🇳 — FIXED app.js
// Preserves existing AI and Web Search APIs
// ========================================

const $ = (id) => document.getElementById(id);

const searchForm = $("searchForm");
const searchInput = $("searchInput");
const searchStatus = $("searchStatus");
const results = $("results");
const answerBox = $("answerBox");
const directAnswer = $("directAnswer");
const answerSource = $("answerSource");
const newsGrid = $("newsGrid");
const newsStatus = $("newsStatus");

const homeBtn = $("homeBtn");
const homeContent = $("homeContent");
const historySection = $("historySection");
const historyList = $("historyList");
const usefulSection = document.querySelector(".useful-section");
const siteFooter = document.querySelector(".site-footer");
const developerSection = $("about-developer");

const accountBtn = $("accountBtn");
const accountMenu = $("accountMenu");
const addAccountBtn = $("addAccountBtn");
const guestBtn = $("guestBtn");
const openHistoryBtn = $("openHistoryBtn");
const backFromHistoryBtn = $("backFromHistoryBtn");
const delete15Btn = $("delete15Btn");
const deleteAllBtn = $("deleteAllBtn");
const clearHistoryBtn = $("clearHistoryBtn");

const voiceBtn = $("micBtn");
const cameraBtn = $("cameraBtn");
const cameraInput = $("imageInput");
const imagePreviewBox = $("imagePreviewBox");
const imagePreview = $("imagePreview");
const removeImageBtn = $("removeImageBtn");
const refreshNewsBtn = $("refreshNewsBtn");

const HISTORY_KEY = "searchIndiaHistory";
const MAX_HISTORY = 50;

let historyViewActive = false;

// ========================================
// HELPERS
// ========================================

function setStatus(message) {
  if (searchStatus) {
    searchStatus.textContent = message;
    showElement(searchStatus);
  }
}

function showElement(element) {
  if (element) element.classList.remove("hidden");
}

function hideElement(element) {
  if (element) element.classList.add("hidden");
}

function closeAccountMenu() {
  hideElement(accountMenu);
  if (accountBtn) {
    accountBtn.setAttribute("aria-expanded", "false");
  }
}

function clearResults() {
  if (results) {
    results.replaceChildren();

    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "🔎 कुछ खोजने के बाद web results यहाँ दिखाई देंगे।";
    results.appendChild(empty);
  }

  if (directAnswer) {
    directAnswer.textContent = "";
  }

  if (answerSource) {
    answerSource.textContent = "";
    answerSource.removeAttribute("href");
  }

  hideElement(answerBox);
}

function safeUrl(value) {
  try {
    const url = new URL(value, window.location.href);

    if (url.protocol === "https:" || url.protocol === "http:") {
      return url.href;
    }
  } catch (_) {}

  return null;
}

function createLink(title, url, description = "") {
  const safe = safeUrl(url);
  if (!safe) return null;

  const card = document.createElement("article");
  card.className = "result-card";

  const heading = document.createElement("h3");
  const link = document.createElement("a");

  link.href = safe;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = title || safe;

  heading.appendChild(link);
  card.appendChild(heading);

  if (description) {
    const paragraph = document.createElement("p");
    paragraph.textContent = description;
    card.appendChild(paragraph);
  }

  return card;
}

function addLink(title, url, description = "") {
  const card = createLink(title, url, description);
  if (card && results) results.appendChild(card);
}

async function readJson(response) {
  const text = await response.text();
  let data;

  try {
    data = JSON.parse(text);
  } catch (_) {
    throw new Error("Server se valid JSON response nahi mila.");
  }

  if (!response.ok) {
    throw new Error(
      data.error || data.message || `Server error (${response.status})`
    );
  }

  return data;
}

// ========================================
// HOME / HISTORY NAVIGATION
// ========================================

function showHome() {
  historyViewActive = false;

  showElement(homeContent);
  hideElement(historySection);
  showElement(usefulSection);
  showElement(siteFooter);
  showElement(developerSection);

  closeAccountMenu();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function showHistory() {
  historyViewActive = true;

  hideElement(homeContent);
  showElement(historySection);
  hideElement(usefulSection);
  hideElement(siteFooter);
  hideElement(developerSection);

  closeAccountMenu();
  renderHistory();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

if (homeBtn) {
  homeBtn.addEventListener("click", showHome);
}

if (backFromHistoryBtn) {
  backFromHistoryBtn.addEventListener("click", showHome);
}

// ========================================
// ACCOUNT MENU
// ========================================

if (accountBtn && accountMenu) {
  accountBtn.addEventListener("click", (event) => {
    event.stopPropagation();

    const opening = accountMenu.classList.contains("hidden");

    accountMenu.classList.toggle("hidden", !opening);
    accountBtn.setAttribute("aria-expanded", String(opening));
  });

  accountMenu.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  document.addEventListener("click", closeAccountMenu);
}

if (addAccountBtn) {
  addAccountBtn.addEventListener("click", () => {
    closeAccountMenu();
    window.location.href = "login.html";
  });
}

if (guestBtn) {
  guestBtn.addEventListener("click", () => {
    closeAccountMenu();
    setStatus("Aap guest mode mein Search India use kar sakte hain.");
  });
}

if (openHistoryBtn) {
  openHistoryBtn.addEventListener("click", showHistory);
}

// ========================================
// SEARCH HISTORY
// ========================================

function getHistory() {
  try {
    const data = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(data) ? data : [];
  } catch (_) {
    return [];
  }
}

function writeHistory(history) {
  try {
    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(history.slice(0, MAX_HISTORY))
    );
    return true;
  } catch (_) {
    setStatus("Search history save nahi ho paayi.");
    return false;
  }
}

function saveHistory(query) {
  const clean = String(query || "").trim();
  if (!clean) return;

  const history = getHistory().filter((item) => {
    return (
      item &&
      typeof item.query === "string" &&
      item.query.toLowerCase() !== clean.toLowerCase()
    );
  });

  history.unshift({
    query: clean,
    time: new Date().toISOString()
  });

  writeHistory(history);
}

function formatHistoryTime(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function renderHistory() {
  if (!historyList) return;

  historyList.replaceChildren();

  const history = getHistory();

  if (history.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-history";
    empty.textContent = "🕘 Abhi aapki search history khaali hai.";
    historyList.appendChild(empty);
    return;
  }

  history.forEach((item, index) => {
    if (!item || typeof item.query !== "string") return;

    const row = document.createElement("div");
    row.className = "history-item";

    const searchButton = document.createElement("button");
    searchButton.type = "button";
    searchButton.className = "history-search";

    const queryText = document.createElement("span");
    queryText.textContent = "🔎 " + item.query;
    searchButton.appendChild(queryText);

    const timeText = document.createElement("small");
    timeText.textContent = formatHistoryTime(item.time);
    searchButton.appendChild(timeText);

    searchButton.addEventListener("click", () => {
      showHome();

      if (searchInput) {
        searchInput.value = item.query;
      }

      performSearch(item.query);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "history-delete";
    deleteButton.textContent = "🗑️";
    deleteButton.title = "Delete this search";
    deleteButton.setAttribute("aria-label", "Delete " + item.query);

    deleteButton.addEventListener("click", () => {
      const current = getHistory();

      // Remove only the selected entry.
      const target = current[index];

      if (target && target.query === item.query && target.time === item.time) {
        current.splice(index, 1);
      } else {
        const matchIndex = current.findIndex((entry) => {
          return entry &&
            entry.query === item.query &&
            entry.time === item.time;
        });

        if (matchIndex !== -1) current.splice(matchIndex, 1);
      }

      if (writeHistory(current)) {
        renderHistory();
      }
    });

    row.appendChild(searchButton);
    row.appendChild(deleteButton);
    historyList.appendChild(row);
  });
}

function deleteLast15Minutes() {
  const cutoff = Date.now() - 15 * 60 * 1000;

  const remaining = getHistory().filter((item) => {
    if (!item || !item.time) return true;

    const timestamp = new Date(item.time).getTime();

    // Keep old entries and entries with unrecognizable timestamps.
    return Number.isNaN(timestamp) || timestamp < cutoff;
  });

  if (writeHistory(remaining)) {
    if (historyViewActive) renderHistory();
    setStatus("Pichhle 15 minutes ki search history delete kar di gayi.");
  }
}

function deleteAllHistory() {
  try {
    localStorage.removeItem(HISTORY_KEY);

    if (historyViewActive) renderHistory();

    setStatus("Search history delete kar di gayi.");
  } catch (_) {
    setStatus("History delete nahi ho paayi.");
  }
}

if (clearHistoryBtn) {
  clearHistoryBtn.addEventListener("click", deleteAllHistory);
}

if (delete15Btn) {
  delete15Btn.addEventListener("click", () => {
    closeAccountMenu();
    deleteLast15Minutes();
  });
}

if (deleteAllBtn) {
  deleteAllBtn.addEventListener("click", () => {
    closeAccountMenu();
    deleteAllHistory();
  });
}

// ========================================
// AI ANSWER — EXISTING API PRESERVED
// ========================================

async function getAIAnswer(query) {
  const response = await fetch("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: query,
      query: query
    })
  });

  return readJson(response);
}

function displayAIAnswer(data) {
  const answer =
    data.answer || data.text || data.response || data.result || "";

  if (!answer) return false;

  if (directAnswer) {
    directAnswer.textContent = answer;
  }

  showElement(answerBox);

  const source = safeUrl(
    data.sourceUrl || data.source_url || data.url || ""
  );

  if (answerSource) {
    if (source) {
      answerSource.textContent = "";

      const link = document.createElement("a");
      link.href = source;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Source";

      answerSource.appendChild(link);
    } else {
      answerSource.textContent = data.source || "";
      answerSource.removeAttribute("href");
    }
  }

  return true;
}

// ========================================
// WEB SEARCH — EXISTING GET API PRESERVED
// ========================================

async function getWebResults(query) {
  const url = "/api/search?q=" + encodeURIComponent(query);
  const response = await fetch(url, { method: "GET" });
  return readJson(response);
}

function displayWebResults(data, query) {
  const items = Array.isArray(data.results)
    ? data.results
    : Array.isArray(data.items)
      ? data.items
      : Array.isArray(data.webResults)
        ? data.webResults
        : Array.isArray(data.organic)
          ? data.organic
          : [];

  if (!results) return false;

  if (items.length === 0) {
    const message = document.createElement("p");
    message.textContent = "Is query ke liye web results nahi mile.";
    results.appendChild(message);

    addLink(
      "Bing par is query ko search karein",
      "https://www.bing.com/search?q=" + encodeURIComponent(query)
    );

    return false;
  }

  items.forEach((item) => {
    if (!item) return;

    addLink(
      item.title || item.name || "Search result",
      item.url || item.link || item.href || "",
      item.snippet || item.description || item.content || ""
    );
  });

  if (data.answer) {
    const summary = document.createElement("p");
    summary.textContent = "Web summary: " + data.answer;
    results.prepend(summary);
  }

  return true;
}

// ========================================
// MAIN SEARCH
// ========================================

async function performSearch(rawQuery) {
  const query = String(rawQuery || "").trim();

  if (!query) {
    setStatus("Pehle kuch search karein.");
    if (searchInput) searchInput.focus();
    return;
  }

  showHome();
  saveHistory(query);
  clearResults();
  setStatus("Search ho rahi hai...");

  if (homeContent) {
    homeContent.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  const jobs = await Promise.allSettled([
    getAIAnswer(query),
    getWebResults(query)
  ]);

  let aiWorked = false;
  let webWorked = false;
  const errors = [];

  if (jobs[0].status === "fulfilled") {
    aiWorked = displayAIAnswer(jobs[0].value);
    if (!aiWorked) errors.push("AI response mein answer nahi mila.");
  } else {
    errors.push(
      "AI: " + (jobs[0].reason?.message || "Request failed")
    );
  }

  if (jobs[1].status === "fulfilled") {
    webWorked = displayWebResults(jobs[1].value, query);
  } else {
    errors.push(
      "Web: " + (jobs[1].reason?.message || "Request failed")
    );
  }

  if (aiWorked && webWorked) {
    setStatus("AI answer aur web results mil gaye.");
  } else if (aiWorked || webWorked) {
    setStatus(
      "Kuch results mile; kuch features unavailable hain. " +
      errors.join(" | ")
    );
  } else {
    setStatus("Search mein samasya: " + errors.join(" | "));
  }
}

if (searchForm) {
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    performSearch(searchInput ? searchInput.value : "");
  });
}

// ========================================
// VOICE SEARCH
// ========================================

if (voiceBtn) {
  voiceBtn.addEventListener("click", () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setStatus("Voice search ke liye supported Chrome browser use karein.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "hi-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setStatus("Boliye, Search India sun raha hai...");
    };

    recognition.onresult = (event) => {
      const transcript =
        event.results?.[0]?.[0]?.transcript || "";

      if (searchInput) searchInput.value = transcript;
      if (transcript) performSearch(transcript);
    };

    recognition.onerror = () => {
      setStatus(
        "Voice search nahi chali. Microphone permission check karein."
      );
    };

    try {
      recognition.start();
    } catch (_) {
      setStatus("Voice search start nahi ho paayi. Dobara try karein.");
    }
  });
}

// ========================================
// CAMERA / IMAGE PREVIEW
// This preview does not upload the image.
// ========================================

if (cameraBtn && cameraInput) {
  cameraBtn.addEventListener("click", () => cameraInput.click());

  cameraInput.addEventListener("change", () => {
    const file = cameraInput.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setStatus("Kripya ek image file select karein.");
      cameraInput.value = "";
      return;
    }

    if (imagePreview && imagePreviewBox) {
      if (imagePreview.dataset.objectUrl) {
        URL.revokeObjectURL(imagePreview.dataset.objectUrl);
      }

      const objectUrl = URL.createObjectURL(file);
      imagePreview.src = objectUrl;
      imagePreview.dataset.objectUrl = objectUrl;

      showElement(imagePreviewBox);
    }

    setStatus(
      "Image select ho gayi. Image se AI answer ke liye vision API chahiye."
    );

    if (searchInput && !searchInput.value.trim()) {
      searchInput.value = file.name
        .replace(/\.[^.]+$/, "")
        .replace(/[-_]/g, " ");
    }
  });
}

if (removeImageBtn) {
  removeImageBtn.addEventListener("click", () => {
    if (imagePreview?.dataset.objectUrl) {
      URL.revokeObjectURL(imagePreview.dataset.objectUrl);
      delete imagePreview.dataset.objectUrl;
    }

    if (imagePreview) imagePreview.removeAttribute("src");
    if (cameraInput) cameraInput.value = "";

    hideElement(imagePreviewBox);
    setStatus("Image hata di gayi.");
  });
}

// ========================================
// NEWS — PHOTO + HEADLINE + DESCRIPTION
// Supports common image URL field names.
// ========================================

function getNewsImage(item) {
  const candidates = [
    item.image,
    item.imageUrl,
    item.image_url,
    item.thumbnail,
    item.thumbnailUrl,
    item.thumbnail_url,
    item.urlToImage,
    item.url_to_image,
    item.photo,
    item.media
  ];

  for (const candidate of candidates) {
    let value = candidate;

    if (candidate && typeof candidate === "object") {
      value =
        candidate.url ||
        candidate.src ||
        candidate.image ||
        "";
    }

    const safe = safeUrl(value);
    if (safe) return safe;
  }

  return "";
}

function createNewsCard(item) {
  const articleUrl = safeUrl(item.url || item.link || item.href || "");
  if (!articleUrl) return null;

  const card = document.createElement("article");
  card.className = "news-card";

  const link = document.createElement("a");
  link.className = "news-card-link";
  link.href = articleUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";

  const imageUrl = getNewsImage(item);

  if (imageUrl) {
    const image = document.createElement("img");
    image.src = imageUrl;
    image.alt = item.title || item.name || "News image";
    image.loading = "lazy";
    image.referrerPolicy = "no-referrer";

    image.addEventListener("error", () => {
      image.remove();
    }, { once: true });

    link.appendChild(image);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "news-image-placeholder";
    placeholder.textContent = "📰";
    placeholder.setAttribute("aria-label", "News image unavailable");
    placeholder.style.cssText =
      "display:flex;align-items:center;justify-content:center;" +
      "width:100%;height:155px;margin-bottom:14px;" +
      "background:#eef1f6;font-size:42px;border-radius:8px;";

    link.appendChild(placeholder);
  }

  const heading = document.createElement("h3");
  heading.textContent = item.title || item.name || "News";
  link.appendChild(heading);

  const description =
    item.description || item.summary || item.snippet || "";

  if (description) {
    const paragraph = document.createElement("p");
    paragraph.textContent = description;
    link.appendChild(paragraph);
  }

  const sourceName =
    item.source?.name ||
    item.source ||
    item.publisher ||
    "";

  if (typeof sourceName === "string" && sourceName) {
    const source = document.createElement("div");
    source.className = "news-source";
    source.textContent = sourceName;
    link.appendChild(source);
  }

  card.appendChild(link);
  return card;
}

async function loadNews() {
  if (!newsGrid) return;

  newsGrid.replaceChildren();

  if (newsStatus) {
    newsStatus.textContent = "ताज़ा खबरें लोड हो रही हैं...";
  }

  if (refreshNewsBtn) refreshNewsBtn.disabled = true;

  try {
    const response = await fetch("/api/news");
    const data = await readJson(response);

    const items = Array.isArray(data.news)
      ? data.news
      : Array.isArray(data.articles)
        ? data.articles
        : Array.isArray(data.results)
          ? data.results
          : [];

    const cards = items
      .map((item) => item && createNewsCard(item))
      .filter(Boolean);

    if (cards.length === 0) {
      newsGrid.textContent = "Abhi news available nahi hai.";

      if (newsStatus) {
        newsStatus.textContent =
          "खबरें उपलब्ध नहीं हैं। थोड़ी देर बाद Refresh करें।";
      }

      return;
    }

    cards.forEach((card) => newsGrid.appendChild(card));

    if (newsStatus) {
      newsStatus.textContent = "ताज़ा खबरें — " + cards.length + " खबरें";
    }
  } catch (error) {
    newsGrid.textContent =
      "News abhi load nahi ho paayi. Baad mein try karein.";

    if (newsStatus) {
      newsStatus.textContent = "News load karne mein samasya aayi.";
    }

    console.error("Search India news error:", error);
  } finally {
    if (refreshNewsBtn) refreshNewsBtn.disabled = false;
  }
}

if (refreshNewsBtn) {
  refreshNewsBtn.addEventListener("click", loadNews);
}

// ========================================
// QUICK SEARCH
// ========================================

document.querySelectorAll("[data-search]").forEach((button) => {
  button.addEventListener("click", () => {
    const query = button.getAttribute("data-search") || "";

    if (searchInput) searchInput.value = query;

    performSearch(query);
  });
});

// ========================================
// INITIALIZE
// ========================================

loadNews();

if (searchInput) {
  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      searchInput.value = "";
      clearResults();
      setStatus("Search clear kar di gayi.");
    }
  });
}

console.log("Search India app.js loaded successfully.");
    
