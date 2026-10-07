// ==========================================
// 🇮🇳 SEARCH INDIA - MAIN APP.JS
// ==========================================

const API_BASE = "https://search-india.vercel.app";

// ---------- Elements ----------
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");

const searchSection = document.getElementById("searchSection");
const searchStatus = document.getElementById("searchStatus");
const results = document.getElementById("results");

const answerSection = document.getElementById("answerSection");
const directAnswer = document.getElementById("directAnswer");
const answerSource = document.getElementById("answerSource");


// ==========================================
// Helper: Timeout Fetch
// ==========================================

async function fetchWithTimeout(url, options = {}, timeout = 35000) {

  const controller = new AbortController();

  const timer = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {

    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    return response;

  } finally {

    clearTimeout(timer);

  }
}


// ==========================================
// HTML Escape - Security
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
// Search Status
// ==========================================

function setSearchStatus(message, type = "") {

  if (!searchStatus) return;

  searchStatus.textContent = message;

  searchStatus.className = "status";

  if (type) {
    searchStatus.classList.add(type);
  }

}


// ==========================================
// Button Loading
// ==========================================

function setLoading(loading) {

  if (!searchBtn) return;

  if (loading) {

    searchBtn.disabled = true;
    searchBtn.textContent = "खोज रहे हैं...";

  } else {

    searchBtn.disabled = false;
    searchBtn.textContent = "खोजें";

  }

}


// ==========================================
// AI Loading
// ==========================================

function showAILoading() {

  if (!answerSection) return;

  answerSection.classList.remove("hidden");

  if (directAnswer) {

    directAnswer.innerHTML = `
      <div>
        🤖 AI जवाब तैयार कर रहा है...
      </div>
    `;

  }

  if (answerSource) {

    answerSource.textContent = "Search India AI";

  }

}


// ==========================================
// AI Answer
// ==========================================

async function getAIAnswer(query) {

  showAILoading();

  try {

    const response = await fetchWithTimeout(
      `${API_BASE}/api/ask`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          query: query
        })
      },
      35000
    );


    const
