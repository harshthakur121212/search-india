
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const form = document.getElementById("authForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const status = document.getElementById("authStatus");

function showMessage(message) {
  if (status) status.textContent = message;
}

if (form && signupBtn && loginBtn) {
  signupBtn.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || password.length < 6) {
      showMessage("Valid email aur kam se kam 6-character password daalein.");
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      showMessage("Account ban gaya! Aap login ho gaye hain.");
    } catch (error) {
      showMessage(getFriendlyError(error.code));
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      showMessage("Login successful! Search India khul raha hai...");
      window.location.href = "index.html";
    } catch (error) {
      showMessage(getFriendlyError(error.code));
    }
  });
}

function getFriendlyError(code) {
  const messages = {
    "auth/invalid-email": "Email address sahi nahi hai.",
    "auth/user-not-found": "Is email ka account nahi mila. Pehle account banayein.",
    "auth/wrong-password": "Password galat hai.",
    "auth/invalid-credential": "Email ya password galat hai.",
    "auth/email-already-in-use": "Is email se account pehle se hai. Login karein.",
    "auth/weak-password": "Password kam se kam 6 characters ka rakhein.",
    "auth/too-many-requests": "Bahut attempts hue. Thodi der baad try karein."
  };

  return messages[code] || "Login mein dikkat aayi. Dobara try karein.";
}

// Account status check
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Signed in:", user.email);
  } else {
    console.log("No user signed in");
  }
});
                   
