
"use strict";

// ========================================
// SEARCH INDIA 🇮🇳 — app.js
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

const voiceBtn = document.getElementById("micBtn");
const cameraBtn = document.getElementById("cameraBtn");
const cameraInput = document.getElementById("imageInput");

const HISTORY_KEY = "searchIndiaHistory";
const MAX_HISTORY = 50;

// ========================================
// GENERAL HELPERS
// ========================================

function setStatus(message) {
  if (searchStatus) searchStatus.textContent = message;
}

function closeAccountMenu() {
  if (accountMenu) accountMenu.classList.add("hidden");
  if (accountBtn) accountBtn.setAttribute("aria-expanded", "false");
}

function showElement(element) {
  if (element) element.classList.remove("hidden");
}

function hideElement(element) {
  if (element) element.classList.add("hidden");
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

  if (card && results) {
    results.appendChild(card);
  }
}

async function readJson(response) {
  const text = await response.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch (_) {
    throw new Error("Server se sahi JSON response nahi mila.");
  }

  if (!response.ok) {
    throw new Error(
      data.error ||
      data.message ||
      `Server error (${response.status})`
    );
  }

  return data;
}

// ========================================
// ACCOUNT MENU + LOGIN
// ========================================

if (accountBtn && accountMenu) {
  accountBtn.addEventListener("click", (event) => {
    event.stopPropagation();

    const shouldOpen =
      accountMenu.classList.contains("hidden");

    accountMenu.classList.toggle("hidden", !shouldOpen);

    accountBtn.setAttribute(
      "aria-expanded",
      String(shouldOpen)
    );
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

    setStatus(
      "Aap guest mode mein Search India use kar sakte hain."
    );
  });
}

// ========================================
// SEARCH HISTORY
// ========================================

function getHistory() {
  try {
    const data = JSON.parse(
      localStorage.getItem(HISTORY_KEY) || "[]"
    );

    return Array.isArray(data) ? data : [];
  } catch (_) {
    return [];
  }
}

function saveHistory(query) {
  const clean = query.trim();
  if (!clean) return;

  const history = getHistory().filter(
    (item) =>
      item.query.toLowerCase() !== clean.toLowerCase()
  );

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

  clearResults();

  const history = getHistory();

  if (history.length === 0) {
    setStatus("Abhi search history khaali hai.");
    return;
  }

  setStatus("Aapki recent searches:");

  history.forEach((item) => {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "history-item";
    button.textContent = item.query;

    button.addEventListener("click", () => {
      if (searchInput) {
        searchInput.value = item.query;
      }

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
        behavior: "smooth"
      });
    }
  });
}

if (backFromHistoryBtn) {
  backFromHistoryBtn.addEventListener("click", () => {
    clearResults();
    setStatus("Search India mein apni search likhein.");
  });
}

if (delete15Btn) {
  delete15Btn.addEventListener("click", () => {
    const history = getHistory().slice(15);

    try {
      localStorage.setItem(
        HISTORY_KEY,
        JSON.stringify(history)
      );

      renderHistory();
      setStatus("Purani 15 searches delete kar di gayi hain.");
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
// Requires /api/ask endpoint
// ========================================

async function getAIAnswer(query) {
  const response = await fetch("/api/ask", {
    method: "POST",

    headers: {
      "Content-Type": "application/json"
    },

    body: JSON.stringify({
      question: query,
      query: query
    })
  });

  return readJson(response);
}

function displayAIAnswer(data) {
  const answer =
    data.answer ||
    data.text ||
    data.response ||
    data.result ||
    "";

  if (!answer) return false;

  if (directAnswer) {
    directAnswer.textContent = answer;
  }

  if (answerBox) {
    showElement(answerBox);
  }

  const source =
    data.sourceUrl ||
    data.source_url ||
    data.url ||
    "";

  const safe = safeUrl(source);

  if (answerSource) {
    if (safe) {
      answerSource.href = safe;
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
// WEB RESULTS
// Requires /api/search endpoint
// ========================================

async function getWebResults(query) {
  const response = await fetch("/api/search", {
    method: "POST",

    headers: {
      "Content-Type": "application/json"
    },

    body: JSON.stringify({
      query: query,
      q: query
    })
  });

  return readJson(response);
}

function displayWebResults(data) {
  const items =
    data.results ||
    data.items ||
    data.webResults ||
    data.organic ||
    [];

  if (!Array.isArray(items) || items.length === 0) {
    const query = searchInput
      ? searchInput.value
      : "";

    addLink(
      `Search the web for: ${query}`,
      "https://www.bing.com/search?q=" +
        encodeURIComponent(query)
    );

    return;
  }

  items.forEach((item) => {
    const title =
      item.title || item.name || "Search result";

    const url =
      item.url || item.link || item.href || "";

    const description =
      item.description ||
      item.snippet ||
      item.content ||
      "";

    addLink(title, url, description);
  });
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
  const errorMessages = [];

  if (jobs[0].status === "fulfilled") {
    aiWorked = displayAIAnswer(jobs[0].value);
  } else {
    errorMessages.push(
      "AI: " + jobs[0].reason.message
    );
  }

  if (jobs[1].status === "fulfilled") {
    displayWebResults(jobs[1].value);
    webWorked = true;
  } else {
    errorMessages.push(
      "Web: " + jobs[1].reason.message
    );
  }

  if (aiWorked && webWorked) {
    setStatus("AI answer aur web results mil gaye.");
  } else if (aiWorked || webWorked) {
    setStatus(
      "Kuch results mil gaye hain. Kuch features abhi unavailable hain."
    );
  } else {
    setStatus(
      "Search API mein samasya hai. " +
      errorMessages.join(" | ")
    );
  }
}

if (searchForm) {
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();

    performSearch(
      searchInput ? searchInput.value : ""
    );
  });
}

// ========================================
// VOICE SEARCH
// ========================================

if (voiceBtn) {
  voiceBtn.addEventListener("click", () => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setStatus(
        "Voice search ke liye Chrome browser use karein."
      );
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
        event.results[0][0].transcript;

      if (searchInput) {
        searchInput.value = transcript;
      }

      performSearch(transcript);
    };

    recognition.onerror = () => {
      setStatus(
        "Voice search nahi chal paayi. Microphone permission check karein."
      );
    };

    recognition.onend = () => {
      if (
        searchStatus &&
        searchStatus.textContent.includes("sun raha")
      ) {
        setStatus("Voice search band ho gayi.");
      }
    };

    recognition.start();
  });
}

// ========================================
// CAMERA / IMAGE SEARCH
// ========================================

if (cameraBtn && cameraInput) {
  cameraBtn.addEventListener("click", () => {
    cameraInput.click();
  });

  cameraInput.addEventListener("change", () => {
    const file =
      cameraInput.files &&
      cameraInput.files[0];

    if (!file) return;

    setStatus(
      "Image select ho gayi. Image ko samajhne ke liye vision API connect karni hogi."
    );

    if (
      searchInput &&
      !searchInput.value.trim()
    ) {
      searchInput.value = file.name
        .replace(/\.[^.]+$/, "")
        .replace(/[-_]/g, " ");
    }

    // Image ko automatically kisi server par upload nahi kiya jaata.
  });
}

// ========================================
// NEWS
// Requires /api/news endpoint
// ========================================

async function loadNews() {
  if (!newsGrid) return;

  newsGrid.replaceChildren();

  try {
    const response = await fetch("/api/news");
    const data = await readJson(response);

    const items =
      data.news ||
      data.articles ||
      data.results ||
      [];

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      newsGrid.textContent =
        "Abhi news available nahi hai.";

      return;
    }

    items.forEach((item) => {
      const card = createLink(
        item.title || item.name || "News",
        item.url || item.link || "",
        item.description || item.summary || ""
      );

      if (card) {
        newsGrid.appendChild(card);
      }
    });
  } catch (_) {
    newsGrid.textContent =
      "News abhi load nahi ho paayi. Baad mein dobara try karein.";
  }
}

// ========================================
// QUICK SEARCH BUTTONS
// Uses data-search="your query"
// ========================================

document
  .querySelectorAll("[data-search]")
  .forEach((button) => {
    button.addEventListener("click", () => {
      const query =
        button.getAttribute("data-search") || "";

      if (searchInput) {
        searchInput.value = query;
      }

      performSearch(query);
    });
  });

// ========================================
// INITIALIZE
// ========================================

loadNews();

if (searchInput) {
  searchInput.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape") {
        searchInput.value = "";
        clearResults();

        setStatus("Search clear kar di gayi.");
      }
    }
  );
}

console.log(
  "Search India app.js loaded successfully."
);
    
