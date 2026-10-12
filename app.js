
"use strict";

// ========================================
// SEARCH INDIA 🇮🇳 — UPDATED app.js
// ========================================

const $ = (id) => document.getElementById(id);

const searchForm = $("searchForm");
const searchInput = $("searchInput");
const searchSection = $("searchSection");
const searchStatus = $("searchStatus");
const results = $("results");
const answerBox = $("answerBox");
const directAnswer = $("directAnswer");
const answerSource = $("answerSource");
const newsGrid = $("newsGrid");

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

const HISTORY_KEY = "searchIndiaHistory";
const MAX_HISTORY = 50;

let historyViewActive = false;

// ========================================
// HELPERS
// ========================================

function setStatus(message) {
  if (searchStatus) searchStatus.textContent = message;
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
  if (results) results.replaceChildren();
  if (directAnswer) directAnswer.textContent = "";

  if (answerSource) {
    answerSource.textContent = "";
    answerSource.removeAttribute("href");
  }

  hideElement(answerBox);
}

function safeUrl(value) {
  try {
    const url = new URL(value);
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

function saveHistory(query) {
  const clean = String(query || "").trim();
  if (!clean) return;

  const history = getHistory().filter((item) => {
    return typeof item.query === "string" &&
      item.query.toLowerCase() !== clean.toLowerCase();
  });

  history.unshift({
    query: clean,
    time: new Date().toISOString()
  });

  try {
    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(history.slice(0, MAX_HISTORY))
    );
  } catch (_) {
    setStatus("Search history save nahi ho paayi.");
  }
}

function renderHistory() {
  if (!results) return;

  historyViewActive = true;
  clearResults();

  const history = getHistory();

  if (history.length === 0) {
    setStatus("Abhi search history khaali hai.");
    return;
  }

  setStatus("Aapki recent searches:");

  history.forEach((item) => {
    if (!item || typeof item.query !== "string") return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "history-item";
    button.textContent = item.query;

    button.addEventListener("click", () => {
      historyViewActive = false;
      if (searchInput) searchInput.value = item.query;
      performSearch(item.query);
    });

    results.appendChild(button);
  });
}

if (openHistoryBtn) {
  openHistoryBtn.addEventListener("click", () => {
    closeAccountMenu();
    renderHistory();

    if (searchSection) {
      searchSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  });
}

function leaveHistoryView() {
  historyViewActive = false;
  clearResults();
  setStatus("Search India mein apni search likhein.");
}

if (backFromHistoryBtn) {
  backFromHistoryBtn.addEventListener("click", leaveHistoryView);
}

if (clearHistoryBtn) {
  clearHistoryBtn.addEventListener("click", () => {
    try {
      localStorage.removeItem(HISTORY_KEY);
      renderHistory();
      setStatus("Search history clear kar di gayi.");
    } catch (_) {
      setStatus("History clear nahi ho paayi.");
    }
  });
}

if (delete15Btn) {
  delete15Btn.addEventListener("click", () => {
    try {
      const history = getHistory().slice(15);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
      renderHistory();
      setStatus("Sabse purani 15 searches (agar maujood thi) delete kar di gayi hain.");
    } catch (_) {
      setStatus("History delete nahi ho paayi.");
    }
  });
}

if (deleteAllBtn) {
  deleteAllBtn.addEventListener("click", () => {
    try {
      localStorage.removeItem(HISTORY_KEY);
      renderHistory();
      setStatus("Search history delete kar di gayi.");
    } catch (_) {
      setStatus("History delete nahi ho paayi.");
    }
  });
}

// ========================================
// AI ANSWER
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
  const answer = data.answer || data.text || data.response || data.result || "";

  if (!answer) return false;

  if (directAnswer) directAnswer.textContent = answer;
  showElement(answerBox);

  const source = safeUrl(
    data.sourceUrl || data.source_url || data.url || ""
  );

  if (answerSource) {
    if (source) {
      answerSource.href = source;
      answerSource.textContent = "Source";
      answerSource.target = "_blank";
      answerSource.rel = "noopener noreferrer";
    } else {
      answerSource.removeAttribute("href");
      answerSource.textContent = data.source || "";
    }
  }

  return true;
}

// ========================================
// WEB SEARCH — FIXED GET REQUEST
// Matches api/search.js (GET ?q=...)
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

  if (items.length === 0) {
    const message = document.createElement("p");
    message.textContent = "Is query ke liye web results nahi mile.";
    if (results) results.appendChild(message);

    // A fallback link is useful, but it is not an actual API result.
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
    if (results) results.prepend(summary);
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

  historyViewActive = false;
  saveHistory(query);
  clearResults();
  setStatus("Search ho rahi hai...");

  if (searchSection) {
    searchSection.scrollIntoView({
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
    errors.push("AI: " + (jobs[0].reason?.message || "Request failed"));
  }

  if (jobs[1].status === "fulfilled") {
    webWorked = displayWebResults(jobs[1].value, query);
  } else {
    errors.push("Web: " + (jobs[1].reason?.message || "Request failed"));
  }

  if (aiWorked && webWorked) {
    setStatus("AI answer aur web results mil gaye.");
  } else if (aiWorked || webWorked) {
    setStatus("Kuch results mile; kuch features unavailable hain. " + errors.join(" | "));
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

    recognition.onstart = () => setStatus("Boliye, Search India sun raha hai...");

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      if (searchInput) searchInput.value = transcript;
      if (transcript) performSearch(transcript);
    };

    recognition.onerror = () => {
      setStatus("Voice search nahi chali. Microphone permission check karein.");
    };

    recognition.start();
  });
}

// ========================================
// CAMERA / IMAGE PREVIEW
// Image is NOT uploaded automatically.
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
      imagePreview.src = URL.createObjectURL(file);
      showElement(imagePreviewBox);
    }

    setStatus("Image select ho gayi. Image se jawab ke liye vision API alag se connect karni hogi.");

    if (searchInput && !searchInput.value.trim()) {
      searchInput.value = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
    }
  });
}

if (removeImageBtn) {
  removeImageBtn.addEventListener("click", () => {
    if (imagePreview?.src) URL.revokeObjectURL(imagePreview.src);
    if (imagePreview) imagePreview.removeAttribute("src");
    if (cameraInput) cameraInput.value = "";
    hideElement(imagePreviewBox);
    setStatus("Image hata di gayi.");
  });
}

// ========================================
// NEWS
// Requires api/news.js
// ========================================

async function loadNews() {
  if (!newsGrid) return;

  newsGrid.replaceChildren();

  try {
    const response = await fetch("/api/news");
    const data = await readJson(response);

    const items = data.news || data.articles || data.results || [];

    if (!Array.isArray(items) || items.length === 0) {
      newsGrid.textContent = "Abhi news available nahi hai.";
      return;
    }

    items.forEach((item) => {
      const card = createLink(
        item.title || item.name || "News",
        item.url || item.link || "",
        item.description || item.summary || item.snippet || ""
      );

      if (card) newsGrid.appendChild(card);
    });
  } catch (_) {
    newsGrid.textContent = "News abhi load nahi ho paayi. Baad mein try karein.";
  }
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
