import { initializeApp, getApp, getApps } from
  "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

import {
  getAuth,
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

const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

const auth = getAuth(app);

const accountBtn = document.getElementById("accountBtn");
const accountMenu = document.getElementById("accountMenu");
const addAccountBtn = document.getElementById("addAccountBtn");
const guestBtn = document.getElementById("guestBtn");
const logoutBtn = document.getElementById("logoutBtn");
const switchAccountBtn = document.getElementById("switchAccountBtn");
const accountUserInfo = document.getElementById("accountUserInfo");
const accountAvatar = document.getElementById("accountAvatar");
const accountEmail = document.getElementById("accountEmail");
const searchStatus = document.getElementById("searchStatus");

function showStatus(message) {
  if (searchStatus) searchStatus.textContent = message;
}

function hideMenu() {
  accountMenu?.classList.add("hidden");
  accountBtn?.setAttribute("aria-expanded", "false");
}

function updateAccount(user) {
  if (!accountBtn) return;

  if (user?.email) {
    const firstLetter = user.email.trim().charAt(0).toUpperCase();

    accountBtn.textContent = firstLetter;
    accountBtn.classList.add("signed-in");
    accountBtn.title = user.email;
    accountBtn.setAttribute("aria-label", "Account: " + user.email);

    if (accountAvatar) accountAvatar.textContent = firstLetter;
    if (accountEmail) accountEmail.textContent = user.email;

    accountUserInfo?.classList.remove("hidden");
    addAccountBtn?.classList.add("hidden");
    guestBtn?.classList.remove("hidden");
    logoutBtn?.classList.remove("hidden");
    switchAccountBtn?.classList.remove("hidden");
  } else {
    accountBtn.textContent = "👤";
    accountBtn.classList.remove("signed-in");
    accountBtn.title = "Login / Sign up";
    accountBtn.setAttribute("aria-label", "Account menu");

    accountUserInfo?.classList.add("hidden");
    addAccountBtn?.classList.remove("hidden");
    guestBtn?.classList.remove("hidden");
    logoutBtn?.classList.add("hidden");
    switchAccountBtn?.classList.add("hidden");
  }
}

onAuthStateChanged(auth, updateAccount);

addAccountBtn?.addEventListener("click", () => {
  hideMenu();
  window.location.href = "login.html";
});

guestBtn?.addEventListener("click", () => {
  hideMenu();
  showStatus("Aap bina account ke Search India use kar rahe hain.");
});

switchAccountBtn?.addEventListener("click", async () => {
  hideMenu();

  try {
    await signOut(auth);
    window.location.href = "login.html";
  } catch (error) {
    console.error("Switch account failed:", error);
    showStatus("Account switch nahi ho paaya. Dobara try karein.");
  }
});

logoutBtn?.addEventListener("click", async () => {
  hideMenu();

  try {
    await signOut(auth);
    showStatus("Aap logout ho gaye hain.");
  } catch (error) {
    console.error("Logout failed:", error);
    showStatus("Logout nahi ho paaya. Dobara try karein.");
  }
});
