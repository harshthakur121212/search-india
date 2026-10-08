const API_BASE = window.location.origin;

const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const micBtn = document.getElementById("micBtn");
const cameraBtn = document.getElementById("cameraBtn");
const imageInput = document.getElementById("imageInput");

const imagePreviewBox =
  document.getElementById("imagePreviewBox");

const imagePreview =
  document.getElementById("imagePreview");

const removeImageBtn =
  document.getElementById("removeImageBtn");

const directAnswer =
  document.getElementById("directAnswer");

const answerSource =
  document.getElementById("answerSource");

const results =
  document.getElementById("results");

const searchStatus =
  document.getElementById("searchStatus");


let selectedImage = null;


/* ==========================================
   HELPERS
========================================== */

function escapeHTML(value) {

  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function showStatus(message) {

  searchStatus.textContent = message;
  searchStatus.classList.remove("hidden");
}


function hideStatus() {

  searchStatus.classList.add("hidden");
}


/* ==========================================
   IMAGE COMPRESSION
========================================== */

function compressImage(file) {

  return new Promise((resolve, reject) => {

    const reader = new FileReader();

    reader.onload = function () {

      const img = new Image();

      img.onload = function () {

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

        resolve(
          canvas.toDataURL(
            "image/jpeg",
            0.78
          )
        );
      };

      img.onerror = reject;

      img.src = reader.result;
    };

    reader.onerror = reject;

    reader.readAsDataURL(file);
  });
}


/* ==========================================
   CAMERA
========================================== */

cameraBtn.addEventListener("click", () => {

  imageInput.click();

});


imageInput.addEventListener("change", async () => {

  const file = imageInput.files?.[0];

  if (!file) return;

  try {

    showStatus("📷 Photo तैयार हो रही है...");

    selectedImage =
      await compressImage(file);

    imagePreview.src = selectedImage;

    imagePreviewBox.classList.remove(
      "hidden"
    );

    hideStatus();

    searchInput.value =
      "इस photo में दिए गए सवाल का सही answer बताइए";

  } catch (error) {

    console.error(error);

    showStatus(
      "❌ Photo पढ़ने में समस्या आई।"
    );
  }
});


removeImageBtn.addEventListener(
  "click",
  () => {

    selectedImage = null;

    imageInput.value = "";

    imagePreview.src = "";

    imagePreviewBox.classList.add(
      "hidden"
    );

  }
);


/* ==========================================
   VOICE SEARCH
========================================== */

const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;


if (SpeechRecognition) {

  const recognition =
    new SpeechRecognition();

  recognition.lang = "hi-IN";

  recognition.continuous = false;

  recognition.interimResults = false;


  micBtn.addEventListener(
    "click",
    () => {

      try {

        showStatus(
          "🎤 बोलिए... मैं सुन रहा हूँ"
        );

        recognition.start();

      } catch (error) {

        console.log(error);

      }
    }
  );


  recognition.onresult = function(event) {

    const text =
      event.results[0][0].transcript;

    searchInput.value = text;

    hideStatus();

    searchForm.requestSubmit();
  };


  recognition.onerror = function() {

    showStatus(
      "❌ Voice Search शुरू नहीं हो पाया। Microphone permission check करें।"
    );
  };


  recognition.onend = function() {

    setTimeout(() => {

      if (
        searchStatus.textContent.includes(
          "बोलिए"
        )
      ) {
        hideStatus();
      }

    }, 1000);
  };

} else {

  micBtn.addEventListener(
    "click",
    () => {

      showStatus(
        "इस browser में Voice Search supported नहीं है। Chrome इस्तेमाल करें।"
      );

    }
  );
}


/* ==========================================
   AI SEARCH
========================================== */

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


    return data;

  } catch (error) {

    console.error(
      "AI ERROR:",
      error
    );

    throw error;
  }
}


/* ==========================================
   WEB SEARCH
========================================== */

async function webSearch(query) {

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
}


/* ==========================================
   SHOW AI
========================================== */

function showAI(data) {

  if (
    data &&
    data.answer
  ) {

    directAnswer.textContent =
      data.answer;

    answerSource.textContent =
      `Model: ${data.model || "Search India AI"}`;

  } else {

    directAnswer.textContent =
      "AI को answer नहीं मिला।";

    answerSource.textContent = "";
  }
}


/* ==========================================
   SHOW WEB RESULTS
========================================== */

function showResults(data) {

  results.innerHTML = "";


  const items =
    Array.isArray(data?.results)
      ? data.results
      : [];


  if (items.length === 0) {

    results.innerHTML =
      `<div class="empty">
        🔎 इस search के लिए कोई web result नहीं मिला।
      </div>`;

    return;
  }


  items.forEach(item => {

    const card =
      document.createElement("div");

    card.className =
      "result-card";


    card.innerHTML = `

      <h3>
        ${escapeHTML(item.title)}
      </h3>

      <div class="result-url">
        ${escapeHTML(item.url)}
      </div>

      <p>
        ${escapeHTML(item.snippet)}
      </p>

      <a
        class="result-link"
        href="${escapeHTML(item.url)}"
        target="_blank"
        rel="noopener noreferrer">
        परिणाम खोलें →
      </a>

    `;


    results.appendChild(card);

  });
}


/* ==========================================
   MAIN SEARCH
========================================== */

searchForm.addEventListener(
  "submit",
  async function(event) {

    event.preventDefault();


    const query =
      searchInput.value.trim();


    if (!query && !selectedImage) {

      showStatus(
        "पहले कुछ search करें।"
      );

      return;
    }


    showStatus(
      "🔎 Search India खोज रहा है..."
    );


    directAnswer.textContent =
      "🤖 AI सोच रहा है...";

    answerSource.textContent = "";

    results.innerHTML =
      `<div class="empty">
        🌐 Web results खोजे जा रहे हैं...
      </div>`;


    try {

      const aiPromise =
        askAI(
          query ||
          "इस photo में दिए गए question को पढ़कर उसका answer बताइए।",
          selectedImage
        );


      const webPromise =
        query
          ? webSearch(query)
          : Promise.resolve({
              results: []
            });


      const [
        aiResult,
        webResult
      ] =
        await Promise.allSettled([
          aiPromise,
          webPromise
        ]);


      /* AI */

      if (
        aiResult.status === "fulfilled"
      ) {

        showAI(
          aiResult.value
        );

      } else {

        console.error(
          aiResult.reason
        );

        directAnswer.textContent =
          "⚠️ AI answer नहीं मिल पाया।";

        answerSource.textContent =
          "API/model response में समस्या है।";
      }


      /* WEB */

      if (
        webResult.status === "fulfilled"
      ) {

        showResults(
          webResult.value
        );

      } else {

        console.error(
          webResult.reason
        );

        results.innerHTML =
          `<div class="empty">
            ⚠️ Web Search में समस्या आई।
          </div>`;
      }


      hideStatus();

    } catch (error) {

      console.error(error);

      showStatus(
        "❌ Search में समस्या आई।"
      );

    }

  }
);


/* ==========================================
   QUICK SEARCH
========================================== */

document
  .querySelectorAll(
    ".quick-search button"
  )
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        searchInput.value =
          button.dataset.query;

        selectedImage = null;

        imagePreviewBox.classList.add(
          "hidden"
        );

        searchForm.requestSubmit();

      }
    );

  });
