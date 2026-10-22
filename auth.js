import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCoPxiZcmZ9htc_eurK9NW5-oztt4RoGJw",
  authDomain: "search-india-c321f.firebaseapp.com",
  projectId: "search-india-c321f",
  storageBucket: "search-india-c321f.firebasestorage.app",
  messagingSenderId: "739733533539",
  appId: "1:739733533539:web:b234301e4ed7806c759956"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

const form = document.getElementById("authForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const status = document.getElementById("authStatus");

function showMessage(message) {
  if (status) status.textContent = message;
}

function getFriendlyError(code) {
  const messages = {
    "auth/invalid-email": "Email address sahi nahi hai.",
    "auth/user-not-found": "Account nahi mila. Pehle Sign up karein.",
    "auth/wrong-password": "Password galat hai.",
    "auth/invalid-credential": "Email ya password galat hai.",
    "auth/email-already-in-use": "Is email se account pehle se hai. Login karein.",
    "auth/weak-password": "Password kam se kam 6 characters ka rakhein.",
    "auth/too-many-requests": "Bahut attempts hue. Thodi der baad try karein.",
    "auth/network-request-failed": "Internet connection check karke dobara try karein.",
    "auth/operation-not-allowed": "Firebase Console mein Email/Password sign-in enable karein."
  };

  return messages[code] || "Account mein dikkat aayi. Dobara try karein.";
}

if (form && emailInput && passwordInput && loginBtn) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const mode = typeof window.searchIndiaAuthMode === "function"
      ? window.searchIndiaAuthMode()
      : "login";

    if (!email || password.length < 6) {
      showMessage("Valid email aur kam se kam 6-character password daalein.");
      return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = mode === "signup"
      ? "Account ban raha hai..."
      : "Login ho raha hai...";
    showMessage("");

    try {
      if (mode === "signup") {
        await createUserWithEmailAndPassword(auth, email, password);
        showMessage("Account ban gaya! Search India khul raha hai...");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        showMessage("Login successful! Search India khul raha hai...");
      }

      window.location.replace("index.html");
    } catch (error) {
      showMessage(getFriendlyError(error.code));
      loginBtn.disabled = false;
      loginBtn.textContent = mode === "signup"
        ? "Create account"
        : "Login";
    }
  });
}

// Account status check
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Search India account signed in.");
  } else {
    console.log("No account signed in.");
  }
});
