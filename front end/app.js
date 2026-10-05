/* ════════════════════════════════════════════════════════
   Electronic Repair Hub — Frontend Application
   ════════════════════════════════════════════════════════ */

// ── Firebase Config (client-side) ──
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyD0RmhjB9TeIc647qyZ1GILfCrIfIYV53w",
  authDomain: "electronic-repair-hub.firebaseapp.com",
  projectId: "electronic-repair-hub",
  storageBucket: "electronic-repair-hub.firebasestorage.app",
  messagingSenderId: "428669145314",
  appId: "1:428669145314:web:5b6f7c2edf4dcd7b848ebb",
  measurementId: "G-37QQCQ4QDN"
};

let firebaseApp, auth;
try {
  if (firebaseConfig.apiKey === "AIzaSyDPlaceholderKeyHere") {
    console.warn("Using placeholder API key. Skipping Firebase init to use Demo Mode.");
  } else {
    firebaseApp = initializeApp(firebaseConfig);
    auth = getAuth(firebaseApp);
  }
} catch (e) {
  console.warn("Firebase init failed — running in offline/demo mode.", e);
}

// ── API base URL ──
const API_BASE = window.location.origin + "/api";

// ── State ──
let currentUser = null;
let currentUserRole = "customer";
let currentPage = "home";
let idToken = null; // Firebase ID token for API calls

// ════════════════════════════════════════════════════════
//  DOM REFERENCES
// ════════════════════════════════════════════════════════
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

const pages = $$(".page");
const navLinks = $$(".nav__link");
const authBtns = $("#auth-buttons");
const userMenu = $("#user-menu");
const userInitials = $("#user-initials");
const toast = $("#toast");
const nav = $("#main-nav");
const burgerBtn = $("#burger-btn");
const navLinksUl = $("#nav-links");

// ════════════════════════════════════════════════════════
//  DEVICE MODELS LOGIC
// ════════════════════════════════════════════════════════
const deviceModels = {
  mobile: ["iPhone 13", "iPhone 14", "iPhone 15", "Galaxy S21", "Galaxy S23", "Pixel 7", "Pixel 8", "Other"],
  laptop: ["MacBook Air", "MacBook Pro", "Dell XPS", "Lenovo ThinkPad", "HP Spectre", "Other"],
  computer: ["Custom Build", "iMac", "Mac Studio", "HP Pavilion", "Dell Inspiron", "Other"],
  television: ["Samsung Smart TV", "LG OLED", "Sony Bravia", "TCL Roku", "Other"],
  other: ["Other"]
};

const estimatedPrices = {
  mobile: "$50 - $150",
  laptop: "$100 - $300",
  computer: "$80 - $250",
  television: "$100 - $400",
  other: "Varies"
};

function populateModels(deviceSelectId, modelSelectId, groupSelectId) {
  const deviceSelect = $(`#${deviceSelectId}`);
  const modelSelect = $(`#${modelSelectId}`);
  const modelGroup = $(`#${groupSelectId}`);
  
  if (!deviceSelect || !modelSelect || !modelGroup) return;
  
  deviceSelect.addEventListener("change", () => {
    const device = deviceSelect.value;
    modelSelect.innerHTML = '<option value="">Select model...</option>';
    if (device && deviceModels[device]) {
      modelSelect.disabled = false;
      deviceModels[device].forEach(model => {
        const opt = document.createElement("option");
        opt.value = model;
        opt.textContent = model;
        modelSelect.appendChild(opt);
      });
      
      if (deviceSelectId === "book-device") {
        const estDisplay = $("#estimated-price-display");
        const estAmount = $("#estimated-price-amount");
        if (estDisplay && estAmount) {
          estAmount.textContent = estimatedPrices[device] || "Varies";
          estDisplay.classList.remove("hidden");
        }
      }
    } else {
      modelSelect.disabled = true;
      modelSelect.innerHTML = '<option value="">First select a device...</option>';
      if (deviceSelectId === "book-device") {
        $("#estimated-price-display")?.classList.add("hidden");
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  populateModels("book-device", "book-model", "model-group");
  populateModels("book-device-hero", "book-model-hero", "model-group-hero");
});

// ════════════════════════════════════════════════════════
//  API HELPER
// ════════════════════════════════════════════════════════
async function api(endpoint, options = {}) {
  const url = API_BASE + endpoint;
  const headers = { "Content-Type": "application/json", ...options.headers };

  if (idToken) {
    headers["Authorization"] = `Bearer ${idToken}`;
  }

  const res = await fetch(url, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || data.errors?.join(", ") || "API request failed");
  }
  return data;
}

// Check if backend API is reachable
let backendAvailable = false;
async function checkBackend() {
  try {
    const res = await fetch(API_BASE + "/health", { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      backendAvailable = true;
      console.log("✅ Backend API connected");
    }
  } catch {
    backendAvailable = false;
    console.log("⚠️ Backend API not reachable — using demo mode");
  }
}

// ════════════════════════════════════════════════════════
//  TOAST NOTIFICATIONS
// ════════════════════════════════════════════════════════
let toastTimer;
function showToast(message, type = "success") {
  toast.textContent = message;
  toast.className = `toast toast--show toast--${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("toast--show");
  }, 3500);
}

// ════════════════════════════════════════════════════════
//  SPA NAVIGATION
// ════════════════════════════════════════════════════════
function navigateTo(pageName) {
  pages.forEach((p) => p.classList.remove("page--active"));
  const target = $(`#page-${pageName}`);
  if (target) {
    target.classList.add("page--active");
    currentPage = pageName;
  } else {
    $("#page-home").classList.add("page--active");
    currentPage = "home";
  }
  navLinks.forEach((link) => {
    link.classList.toggle("active", link.dataset.page === pageName);
  });
  navLinksUl.classList.remove("nav__links--open");
  window.scrollTo({ top: 0, behavior: "smooth" });

  if (pageName === "dashboard" && currentUser) {
    loadDashboard();
  } else if (pageName === "profile" && currentUser) {
    loadProfile();
  }
}

// Attach click handlers for all [data-page] elements
document.addEventListener("click", (e) => {
  const trigger = e.target.closest("[data-page]");
  if (trigger) {
    e.preventDefault();
    const page = trigger.dataset.page;
    if (["dashboard", "book", "profile"].includes(page) && !currentUser) {
      showToast("Please log in first", "error");
      navigateTo("login");
      return;
    }
    navigateTo(page);
  }
});

// Hero "Book a Repair" button
const heroBookBtn = $("#hero-book-btn");
if (heroBookBtn) {
  heroBookBtn.addEventListener("click", () => {
    if (!currentUser) {
      showToast("Please log in to book a repair", "error");
      navigateTo("login");
    } else {
      navigateTo("book");
    }
  });
}

// "How It Works" → Book button
const hiwBookBtn = $("#hiw-book-btn");
if (hiwBookBtn) {
  hiwBookBtn.addEventListener("click", () => {
    if (!currentUser) {
      showToast("Please log in to book a repair", "error");
      navigateTo("login");
    } else {
      navigateTo("book");
    }
  });
}

// Device cards → go to book page with pre-selected device
$$(".device-card").forEach((card) => {
  card.addEventListener("click", () => {
    if (!currentUser) {
      showToast("Please log in to book a repair", "error");
      navigateTo("login");
      return;
    }
    navigateTo("book");
    const deviceSelect = $("#book-device");
    if (deviceSelect && card.dataset.device) {
      deviceSelect.value = card.dataset.device;
    }
  });
});

// Service "Book Now" buttons
$$(".book-service-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!currentUser) {
      showToast("Please log in to book a repair", "error");
      navigateTo("login");
      return;
    }
    navigateTo("book");
    const deviceSelect = $("#book-device");
    if (deviceSelect && btn.dataset.device) {
      deviceSelect.value = btn.dataset.device;
    }
  });
});

// Logo → home
const navLogo = $("#nav-logo");
if (navLogo) {
  navLogo.addEventListener("click", (e) => {
    e.preventDefault();
    navigateTo("home");
  });
}

// ════════════════════════════════════════════════════════
//  BURGER MENU
// ════════════════════════════════════════════════════════
if (burgerBtn) {
  burgerBtn.addEventListener("click", () => {
    navLinksUl.classList.toggle("nav__links--open");
  });
}

// ════════════════════════════════════════════════════════
//  NAV SCROLL EFFECT
// ════════════════════════════════════════════════════════
window.addEventListener("scroll", () => {
  nav.classList.toggle("nav--scrolled", window.scrollY > 30);
});

// ════════════════════════════════════════════════════════
//  HERO STATS COUNTER ANIMATION
// ════════════════════════════════════════════════════════


// ════════════════════════════════════════════════════════
//  AUTH UI UPDATE & HELPER
// ════════════════════════════════════════════════════════
function getInitials(name) {
  if (!name) return "U";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function updateAuthUI(user) {
  if (user) {
    // User is signed in — show user menu, hide auth buttons
    authBtns.classList.add("hidden");
    userMenu.classList.remove("hidden");

    // Set initials in avatar
    const name = user.displayName || user.email || "U";
    userInitials.textContent = getInitials(name);

    // Show/hide dashboard "New request" button based on role
    const dashNewBtn = $("#dash-new-repair");
    if (dashNewBtn) {
      dashNewBtn.style.display = currentUserRole === "technician" ? "none" : "";
    }
  } else {
    // User is signed out — show auth buttons, hide user menu
    authBtns.classList.remove("hidden");
    userMenu.classList.add("hidden");
    userInitials.textContent = "U";
  }
}

// Listen for Firebase auth state changes
if (auth) {
  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
      // Get fresh ID token for API calls
      idToken = await user.getIdToken();

      // Fetch user profile from backend
      if (backendAvailable) {
        try {
          const data = await api("/auth/me");
          currentUserRole = data.user?.role || "customer";
        } catch {
          currentUserRole = "customer";
        }
      }

      // Auto-redirect from login/signup to dashboard if authenticated
      if (currentPage === "login" || currentPage === "signup") {
        navigateTo("dashboard");
      }
    } else {
      idToken = null;
      currentUserRole = "customer";
      if (["dashboard", "profile", "book"].includes(currentPage)) {
        navigateTo("login");
      }
    }
    updateAuthUI(user);
  });
}

// ── Sign Up ──
const signupForm = $("#signup-form");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = $("#signup-name").value.trim();
    const email = $("#signup-email").value.trim();
    const password = $("#signup-password").value;
    const role = $("#signup-role").value;
    const btn = signupForm.querySelector("button[type=submit]");

    btn.classList.add("btn--loading");
    btn.innerHTML = '<span class="spinner"></span> Creating Account…';

    try {
      if (!auth) throw new Error("Firebase not initialized");
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });

      // Get ID token
      idToken = await cred.user.getIdToken();

      // Register user profile on backend
      if (backendAvailable) {
        await api("/auth/register", {
          method: "POST",
          body: JSON.stringify({ name, role }),
        });
      }

      currentUser = cred.user;
      currentUserRole = role;
      updateAuthUI(cred.user);
      showToast(`Welcome, ${name}! Account created.`);
      navigateTo("dashboard");
      signupForm.reset();
    } catch (err) {
      showToast(err.message || "Sign up failed", "error");
    } finally {
      btn.classList.remove("btn--loading");
      btn.textContent = "Create Account";
    }
  });
}

// ── Log In ──
const loginForm = $("#login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("#login-email").value.trim();
    const password = $("#login-password").value;
    const btn = loginForm.querySelector("button[type=submit]");

    btn.classList.add("btn--loading");
    btn.innerHTML = '<span class="spinner"></span> Logging In…';

    try {
      if (!auth) throw new Error("Firebase not initialized");
      const cred = await signInWithEmailAndPassword(auth, email, password);
      idToken = await cred.user.getIdToken();

      // Fetch profile from backend
      if (backendAvailable) {
        try {
          const data = await api("/auth/me");
          currentUserRole = data.user?.role || "customer";
        } catch {
          currentUserRole = "customer";
        }
      }

      currentUser = cred.user;
      updateAuthUI(cred.user);
      showToast(`Welcome back, ${cred.user.displayName || cred.user.email}!`);
      navigateTo("dashboard");
      loginForm.reset();
    } catch (err) {
      showToast(err.message || "Login failed", "error");
    } finally {
      btn.classList.remove("btn--loading");
      btn.textContent = "Log In";
    }
  });
}

// ── Google Auth ──
const handleGoogleAuth = async (defaultRole = "customer") => {
  try {
    if (!auth) throw new Error("Firebase not initialized");
    const btnGoogleLogin = $("#btn-google-login");
    const btnGoogleSignup = $("#btn-google-signup");
    if (btnGoogleLogin) btnGoogleLogin.classList.add("btn--loading");
    if (btnGoogleSignup) btnGoogleSignup.classList.add("btn--loading");
    
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    idToken = await cred.user.getIdToken();
    
    if (backendAvailable) {
      try {
        await api("/auth/register", {
          method: "POST",
          body: JSON.stringify({ name: cred.user.displayName, role: defaultRole }),
        });
      } catch (e) {
        // user might already be registered, that's fine.
      }
      try {
        const data = await api("/auth/me");
        currentUserRole = data.user?.role || defaultRole;
      } catch {
        currentUserRole = defaultRole;
      }
    }

    currentUser = cred.user;
    updateAuthUI(cred.user);
    showToast(`Welcome, ${cred.user.displayName || cred.user.email}!`);
    navigateTo("dashboard");
  } catch (err) {
    if (err.code !== "auth/popup-closed-by-user") {
      showToast(err.message || "Google Authentication failed", "error");
    }
  } finally {
    const btnGoogleLogin = $("#btn-google-login");
    const btnGoogleSignup = $("#btn-google-signup");
    if (btnGoogleLogin) btnGoogleLogin.classList.remove("btn--loading");
    if (btnGoogleSignup) btnGoogleSignup.classList.remove("btn--loading");
  }
};

const btnGoogleLogin = $("#btn-google-login");
if (btnGoogleLogin) btnGoogleLogin.addEventListener("click", () => handleGoogleAuth("customer"));

const btnGoogleSignup = $("#btn-google-signup");
if (btnGoogleSignup) btnGoogleSignup.addEventListener("click", () => {
  const role = $("#signup-role")?.value || "customer";
  handleGoogleAuth(role);
});

// ── Log Out ──
const logoutBtn = $("#btn-logout");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      if (auth) await signOut(auth);
      currentUser = null;
      currentUserRole = "customer";
      idToken = null;
      updateAuthUI(null);
      showToast("Logged out successfully");
      navigateTo("home");
    } catch (err) {
      showToast("Logout failed", "error");
    }
  });
}

// ════════════════════════════════════════════════════════
//  PROFILE PAGE LOGIC
// ════════════════════════════════════════════════════════
function loadProfile() {
  if (!currentUser) {
    navigateTo("login");
    return;
  }
  const name = currentUser.displayName || (currentUser.email ? currentUser.email.split("@")[0] : "User");
  const initials = getInitials(name);
  
  const largeInitials = $("#profile-initials-large");
  if (largeInitials) largeInitials.textContent = initials;

  const nameDisplay = $("#profile-name-display");
  if (nameDisplay) nameDisplay.textContent = name;

  const nameInput = $("#profile-name-input");
  if (nameInput) nameInput.value = name;

  const emailInput = $("#profile-email-input");
  if (emailInput) emailInput.value = currentUser.email || "";

  const uidInput = $("#profile-uid-input");
  if (uidInput) uidInput.value = currentUser.uid || "Local Demo User";

  const roleSelect = $("#profile-role-select");
  if (roleSelect) roleSelect.value = currentUserRole || "customer";

  const roleBadge = $("#profile-role-badge");
  if (roleBadge) {
    roleBadge.textContent = (currentUserRole || "customer").toUpperCase();
    roleBadge.className = `status-pill ${currentUserRole === "technician" ? "status-pill--in-progress" : "status-pill--accepted"}`;
  }
}

const profileForm = $("#profile-form");
if (profileForm) {
  profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const newName = $("#profile-name-input").value.trim();
    const newRole = $("#profile-role-select").value;
    const btn = $("#btn-save-profile");
    if (btn) btn.classList.add("btn--loading");

    try {
      if (currentUser && auth) {
        await updateProfile(currentUser, { displayName: newName });
      }
      currentUserRole = newRole;
      if (currentUser) {
        currentUser.displayName = newName;
      }

      if (backendAvailable && idToken) {
        try {
          await api("/auth/register", {
            method: "POST",
            body: JSON.stringify({ name: newName, role: newRole }),
          });
        } catch (e) {
          console.warn("Backend profile sync failed", e);
        }
      }

      updateAuthUI(currentUser);
      loadProfile();
      showToast("Profile updated successfully!");
    } catch (err) {
      showToast(err.message || "Failed to update profile", "error");
    } finally {
      if (btn) btn.classList.remove("btn--loading");
    }
  });
}

// ════════════════════════════════════════════════════════
//  REPAIR REQUEST BOOKING
// ════════════════════════════════════════════════════════
function generateRepairId() {
  return "RH" + Math.floor(1000 + Math.random() * 9000);
}

const bookForm = $("#book-form");
if (bookForm) {
  bookForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentUser) {
      showToast("Please log in first", "error");
      navigateTo("login");
      return;
    }

    const deviceType = $("#book-device").value;
    const deviceModel = $("#book-model").value;
    const problem = $("#book-problem").value.trim();
    const address = $("#book-address").value.trim();
    const phone = $("#book-phone").value.trim();
    const btn = bookForm.querySelector("button[type=submit]");

    btn.classList.add("btn--loading");
    btn.innerHTML = '<span class="spinner"></span> Submitting…';

    try {
      if (backendAvailable && idToken) {
        // ── Call backend API ──
        const data = await api("/requests", {
          method: "POST",
          body: JSON.stringify({ deviceType, deviceModel, problem, address, phone }),
        });
        showToast(`Repair request ${data.request.repairId} submitted!`);
      } else {
        // ── Offline demo: store in localStorage ──
        const repairId = generateRepairId();
        const localRequests = JSON.parse(localStorage.getItem("repairRequests") || "[]");
        localRequests.push({
          repairId,
          customerId: currentUser?.uid || "demo",
          customerName: currentUser?.displayName || "Demo User",
          customerEmail: currentUser?.email || "demo@example.com",
          deviceType,
          deviceModel,
          problem,
          address,
          phone,
          status: "requested",
          statusTimestamps: { requested: new Date().toISOString() },
          price: null,
          technicianId: null,
          technicianName: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        localStorage.setItem("repairRequests", JSON.stringify(localRequests));
        showToast(`Repair request ${repairId} submitted! (Demo Mode)`);
      }

      bookForm.reset();
      navigateTo("dashboard");
    } catch (err) {
      showToast(err.message || "Failed to submit request", "error");
    } finally {
      btn.classList.remove("btn--loading");
      btn.textContent = "Submit Repair Request";
    }
  });
}

// ════════════════════════════════════════════════════════
//  TRACK REPAIR
// ════════════════════════════════════════════════════════
const STATUS_ORDER = ["requested", "accepted", "in-progress", "repaired", "completed"];
const STATUS_LABELS = {
  requested: "Requested",
  accepted: "Accepted",
  "in-progress": "In Progress",
  repaired: "Repaired",
  completed: "Completed",
};


function renderStatusTimeline(currentStatus, statusTimestamps = {}) {
  const idx = STATUS_ORDER.indexOf(currentStatus);
  return `
    <div class="timeline">
      ${STATUS_ORDER.map((s, i) => {
    let cls = "";
    if (i < idx) cls = "timeline-step--done";
    else if (i === idx) cls = "timeline-step--active";

    let details = "";
    if (s === "requested") details = "Request submitted by customer.";
    if (s === "accepted") details = "A technician has accepted the job.";
    if (s === "in-progress") details = "Device is currently being repaired.";
    if (s === "repaired") details = "Repair completed successfully.";
    if (s === "completed") details = "Device returned to customer.";

    let timeHtml = "";
    if (statusTimestamps[s]) {
       const d = new Date(statusTimestamps[s]);
       timeHtml = `<div style="font-size: 12px; color: var(--ink-muted); margin-top: 4px;">${d.toLocaleString()}</div>`;
    }

    return `
          <div class="timeline-step ${cls}">
            <h4>${STATUS_LABELS[s]}</h4>
            <p style="margin:0;font-weight:500;">${details}</p>
            ${timeHtml}
          </div>`;
  }).join("")}
    </div>`;
}

function getStatusBadgeClass(status) {
  return `badge badge--${status}`;
}

const trackBtn = $("#track-btn");
const trackInput = $("#track-input");
const trackResult = $("#track-result");

if (trackBtn) {
  trackBtn.addEventListener("click", async () => {
    const rid = trackInput.value.trim().toUpperCase();
    if (!rid) {
      showToast("Please enter a Repair ID", "error");
      return;
    }

    trackBtn.classList.add("btn--loading");
    trackBtn.innerHTML = '<span class="spinner"></span>';

    let found = null;

    try {
      if (backendAvailable) {
        // ── Backend API ──
        const data = await api(`/requests/track/${encodeURIComponent(rid)}`);
        found = data.request;
      } else {
        // ── Offline demo ──
        const localRequests = JSON.parse(localStorage.getItem("repairRequests") || "[]");
        found = localRequests.find((r) => r.repairId === rid) || null;
      }
    } catch (err) {
      // 404 = not found, handled below
      if (!err.message.includes("not found")) {
        console.error(err);
      }
    }

    if (found) {
      const deviceIcons = { mobile: "smartphone", laptop: "laptop", computer: "pc-case", television: "tv", other: "gamepad-2" };
      const createdDate = found.createdAt instanceof Date
        ? found.createdAt.toLocaleDateString()
        : new Date(found.createdAt).toLocaleDateString();

      trackResult.classList.remove("hidden");
      trackResult.innerHTML = `
        <div class="track-result__card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
            <h3>${found.repairId}</h3>
            <span class="${getStatusBadgeClass(found.status)}">${STATUS_LABELS[found.status] || found.status}</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:32px;">
            <div>
              <label style="color:var(--ink-muted);font-size:14px;display:block;margin-bottom:4px;">Device</label>
              <p style="margin:0;font-weight:500;"><i data-lucide="${deviceIcons[found.deviceType] || 'wrench'}" style="width:16px;height:16px;vertical-align:middle;margin-right:4px;"></i> ${found.deviceType?.charAt(0).toUpperCase() + found.deviceType?.slice(1)}${found.deviceModel ? ` (${found.deviceModel})` : ''}</p>
            </div>
            <div>
              <label style="color:var(--ink-muted);font-size:14px;display:block;margin-bottom:4px;">Customer</label>
              <p style="margin:0;font-weight:500;">${found.customerName || "—"}</p>
            </div>
            <div>
              <label style="color:var(--ink-muted);font-size:14px;display:block;margin-bottom:4px;">Problem</label>
              <p style="margin:0;font-weight:500;">${found.problem}</p>
            </div>
            <div>
              <label style="color:var(--ink-muted);font-size:14px;display:block;margin-bottom:4px;">Submitted</label>
              <p style="margin:0;font-weight:500;">${createdDate}</p>
            </div>
            <div>
              <label style="color:var(--ink-muted);font-size:14px;display:block;margin-bottom:4px;">Price</label>
              <p style="margin:0;font-weight:500;color:var(--primary);">${found.price || "Estimated: " + (estimatedPrices[found.deviceType] || "Varies")}</p>
            </div>
          </div>
          ${renderStatusTimeline(found.status, found.statusTimestamps || {})}
        </div>`;
      lucide.createIcons();
    } else {
      trackResult.classList.remove("hidden");
      trackResult.innerHTML = `
        <div style="text-align:center;padding:40px">
          <span style="font-size:2.5rem;display:block;margin-bottom:12px">🔍</span>
          <p style="color:var(--text-muted)">No repair request found with ID <strong>${rid}</strong>. Please check and try again.</p>
        </div>`;
    }

    trackBtn.classList.remove("btn--loading");
    trackBtn.textContent = "Track";
  });
}

// ════════════════════════════════════════════════════════
//  DASHBOARD
// ════════════════════════════════════════════════════════
async function loadDashboard() {
  if (!currentUser) return;

  const greeting = $("#dashboard-greeting");
  if (greeting) {
    greeting.textContent = `Welcome back, ${ currentUser.displayName || currentUser.email } !`;
  }

  const myRequestsEl = $("#my-requests");
  const noRequestsEl = $("#no-requests");
  const techPanel = $("#tech-panel");
  const openRequestsEl = $("#open-requests");

  // Show tech panel for technicians
  if (currentUserRole === "technician" || currentUserRole === "admin") {
    techPanel.classList.remove("hidden");
    await loadOpenRequests(openRequestsEl);
  } else {
    techPanel.classList.add("hidden");
  }

  let requests = [];

  try {
    if (backendAvailable && idToken) {
      // ── Backend API ──
      const data = await api("/requests/mine");
      requests = data.requests || [];
    } else {
      // ── Offline demo ──
      const localRequests = JSON.parse(localStorage.getItem("repairRequests") || "[]");
      requests = localRequests.filter(
        (r) => r.customerId === currentUser?.uid || r.customerId === "demo"
      );
    }
  } catch (err) {
    console.error("Failed to load requests:", err);
  }

  if (requests.length === 0) {
    document.getElementById("my-requests-body").innerHTML = "";
    noRequestsEl.classList.remove("hidden");
  } else {
    noRequestsEl.classList.add("hidden");
    document.getElementById("my-requests-body").innerHTML = requests.map((r) => renderRequestCard(r, false)).join("");lucide.createIcons();
  }
}

async function loadOpenRequests(container) {
  let requests = [];
  try {
    if (backendAvailable && idToken) {
      // ── Backend API ──
      const data = await api("/requests/open");
      requests = data.requests || [];
    } else {
      // ── Offline demo ──
      const localRequests = JSON.parse(localStorage.getItem("repairRequests") || "[]");
      requests = localRequests.filter((r) => r.status === "requested");
    }
  } catch (err) {
    console.error("Failed to load open requests:", err);
  }

  if (requests.length === 0) {
    document.getElementById("open-requests-body").innerHTML = `< tr > <td colspan="5" style="text-align:center;color:var(--ink-muted);">No open requests right now.</td></tr > `;
  } else {
    document.getElementById("open-requests-body").innerHTML = requests.map((r) => renderRequestCard(r, true)).join("");lucide.createIcons();
    // Attach accept handlers
    container.querySelectorAll(".accept-request-btn").forEach((btn) => {
      btn.addEventListener("click", () => acceptRequest(btn.dataset.id, btn.dataset.repairId));
    });
  }
}


function renderRequestCard(r, showAccept = false) {
  const deviceIcons = { mobile: "smartphone", laptop: "laptop", computer: "pc-case", television: "tv", other: "gamepad-2" };
  const createdDate = r.createdAt instanceof Date
    ? r.createdAt.toLocaleDateString()
    : new Date(r.createdAt).toLocaleDateString();

  const isTech = (currentUserRole === "technician" || currentUserRole === "admin");
  const isAssigned = r.technicianId === currentUser?.uid;
  const canUpdateStatus = isTech && isAssigned && r.status !== "completed";

  let statusControls = "";
  if (canUpdateStatus) {
    const currentIdx = STATUS_ORDER.indexOf(r.status);
    const nextStatus = STATUS_ORDER[currentIdx + 1];
    if (nextStatus) {
      statusControls = `<button class="btn btn--outline btn--sm update-status-btn" data-id="${r.id}" data-status="${nextStatus}" data-repair-id="${r.repairId}">Mark ${STATUS_LABELS[nextStatus]}</button>`;
    }
    statusControls += ` <button class="btn btn--outline btn--sm set-price-btn" data-id="${r.id}" data-repair-id="${r.repairId}">${r.price ? 'Update Price (' + r.price + ')' : 'Set Price'}</button>`;
  }

  if (showAccept) {
    return `
        < tr >
        <td><strong>${r.repairId}</strong></td>
        <td><i data-lucide="${deviceIcons[r.deviceType] || 'wrench'}" style="width:16px;height:16px;vertical-align:middle;margin-right:4px;"></i> ${r.deviceType?.charAt(0).toUpperCase() + r.deviceType?.slice(1)}${r.deviceModel ? ` (${r.deviceModel})` : ''}</td>
        <td>${r.problem}</td>
        <td>${createdDate}</td>
        <td>
          <button class="btn btn--outline btn--sm accept-request-btn" data-id="${r.id}" data-repair-id="${r.repairId}">Accept</button>
        </td>
      </tr > `;
  }

  // Dashboard view for customer or technician's own jobs
  return `
        < tr >
      <td><strong>${r.repairId}</strong></td>
      <td><i data-lucide="${deviceIcons[r.deviceType] || 'wrench'}" style="width:16px;height:16px;vertical-align:middle;margin-right:4px;"></i> ${r.deviceType?.charAt(0).toUpperCase() + r.deviceType?.slice(1)}${r.deviceModel ? ` (${r.deviceModel})` : ''}</td>
      <td>
        <span class="${getStatusBadgeClass(r.status)}">${STATUS_LABELS[r.status] || r.status}</span>
        ${r.price ? `<div style="font-size:12px;color:var(--primary);margin-top:4px;">Price: ${r.price}</div>` : ''}
      </td>
      <td>${createdDate}</td>
      ${ isTech ? `<td>${statusControls}</td>` : '' }
    </tr > `;
}

async function acceptRequest(docId, repairId) {
  try {
    if (backendAvailable && idToken && docId) {
      await api(`/ requests / ${ docId }/accept`, { method: "PATCH" });
} else {
  // Offline demo
  const localRequests = JSON.parse(localStorage.getItem("repairRequests") || "[]");
  const idx = localRequests.findIndex((r) => r.repairId === repairId);
  if (idx !== -1) {
    localRequests[idx].status = "accepted";
    localRequests[idx].technicianId = currentUser?.uid || "tech-demo";
    localRequests[idx].technicianName = currentUser?.displayName || "Technician";
    if (!localRequests[idx].statusTimestamps) localRequests[idx].statusTimestamps = {};
    localRequests[idx].statusTimestamps.accepted = new Date().toISOString();
    localRequests[idx].updatedAt = new Date().toISOString();
    localStorage.setItem("repairRequests", JSON.stringify(localRequests));
  }
}
showToast(`Request ${repairId} accepted!`);
loadDashboard();
  } catch (err) {
  showToast(err.message || "Failed to accept request", "error");
}
}

// ── Status update (technician) ──
document.addEventListener("click", async (e) => {
  const btn = e.target.closest(".update-status-btn");
  if (!btn) return;

  const docId = btn.dataset.id;
  const newStatus = btn.dataset.status;
  const repairId = btn.dataset.repairId;

  btn.classList.add("btn--loading");
  btn.innerHTML = '<span class="spinner"></span>';

  try {
    if (backendAvailable && idToken && docId) {
      await api(`/requests/${docId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
    } else {
      const localRequests = JSON.parse(localStorage.getItem("repairRequests") || "[]");
      const idx = localRequests.findIndex((r) => r.repairId === repairId);
      if (idx !== -1) {
        localRequests[idx].status = newStatus;
        if (!localRequests[idx].statusTimestamps) localRequests[idx].statusTimestamps = {};
        localRequests[idx].statusTimestamps[newStatus] = new Date().toISOString();
        localRequests[idx].updatedAt = new Date().toISOString();
        localStorage.setItem("repairRequests", JSON.stringify(localRequests));
      }
    }
    showToast(`${repairId} → ${STATUS_LABELS[newStatus]}`);
    loadDashboard();
  } catch (err) {
    showToast(err.message || "Failed to update status", "error");
  }
});

// ── Price update (technician) ──
document.addEventListener("click", async (e) => {
  const btn = e.target.closest(".set-price-btn");
  if (!btn) return;

  const docId = btn.dataset.id;
  const repairId = btn.dataset.repairId;
  const price = prompt(`Enter price for repair ${repairId} (e.g. $150):`);
  
  if (!price) return;
  
  btn.classList.add("btn--loading");
  btn.innerHTML = '<span class="spinner"></span>';

  try {
    if (backendAvailable && idToken && docId) {
      await api(`/requests/${docId}/price`, {
        method: "PATCH",
        body: JSON.stringify({ price }),
      });
    } else {
      const localRequests = JSON.parse(localStorage.getItem("repairRequests") || "[]");
      const idx = localRequests.findIndex((r) => r.repairId === repairId);
      if (idx !== -1) {
        localRequests[idx].price = price;
        localRequests[idx].updatedAt = new Date().toISOString();
        localStorage.setItem("repairRequests", JSON.stringify(localRequests));
      }
    }
    showToast(`Price updated for ${repairId}`);
    loadDashboard();
  } catch (err) {
    showToast(err.message || "Failed to update price", "error");
    btn.classList.remove("btn--loading");
    btn.textContent = "Set Price";
  }
});

// ════════════════════════════════════════════════════════
//  DEMO MODE (when Firebase is not configured)
// ════════════════════════════════════════════════════════
function seedDemoData() {
  if (localStorage.getItem("repairRequests")) return;
  const demoRequests = [
    {
      repairId: "RH1025",
      customerId: "demo",
      customerName: "Rahul Sharma",
      customerEmail: "rahul@example.com",
      deviceType: "laptop",
      deviceModel: "Dell XPS",
      problem: "Laptop is not powering on. Tried different chargers but no response.",
      address: "123 MG Road, Mumbai",
      phone: "+91 9876543210",
      status: "in-progress",
      statusTimestamps: {
        requested: "2026-10-01T10:30:00Z",
        accepted: "2026-10-02T09:00:00Z",
        "in-progress": "2026-10-03T14:00:00Z"
      },
      price: "$180",
      technicianId: "tech-1",
      technicianName: "Technician A",
      createdAt: "2026-10-01T10:30:00Z",
      updatedAt: "2026-10-03T14:00:00Z",
    },
    {
      repairId: "RH1042",
      customerId: "demo",
      customerName: "Rahul Sharma",
      customerEmail: "rahul@example.com",
      deviceType: "mobile",
      deviceModel: "iPhone 15",
      problem: "Phone screen cracked after a drop. Touch not working on bottom half.",
      address: "123 MG Road, Mumbai",
      phone: "+91 9876543210",
      status: "requested",
      statusTimestamps: {
        requested: "2026-10-04T09:15:00Z"
      },
      price: null,
      technicianId: null,
      technicianName: null,
      createdAt: "2026-10-04T09:15:00Z",
      updatedAt: "2026-10-04T09:15:00Z",
    },
    {
      repairId: "RH1038",
      customerId: "demo",
      customerName: "Rahul Sharma",
      customerEmail: "rahul@example.com",
      deviceType: "television",
      deviceModel: "Samsung Smart TV",
      problem: "Smart TV keeps restarting randomly. Sometimes shows black screen.",
      address: "123 MG Road, Mumbai",
      phone: "+91 9876543210",
      status: "completed",
      statusTimestamps: {
        requested: "2026-09-25T11:00:00Z",
        accepted: "2026-09-25T14:00:00Z",
        "in-progress": "2026-09-26T10:00:00Z",
        repaired: "2026-09-28T12:00:00Z",
        completed: "2026-09-28T16:30:00Z"
      },
      price: "$250",
      technicianId: "tech-2",
      technicianName: "Technician B",
      createdAt: "2026-09-25T11:00:00Z",
      updatedAt: "2026-09-28T16:30:00Z",
    },
  ];
  localStorage.setItem("repairRequests", JSON.stringify(demoRequests));
}

seedDemoData();

// Demo auth fallback when Firebase isn't configured
if (!auth) {
  const demoUser = JSON.parse(localStorage.getItem("demoUser") || "null");
  if (demoUser) {
    currentUser = demoUser;
    currentUserRole = demoUser.role || "customer";
    updateAuthUI(demoUser);
  }

  // Override signup form
  if (signupForm) {
    const newSignup = signupForm.cloneNode(true);
    signupForm.parentNode.replaceChild(newSignup, signupForm);
    newSignup.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = newSignup.querySelector("#signup-name").value.trim();
      const email = newSignup.querySelector("#signup-email").value.trim();
      const role = newSignup.querySelector("#signup-role").value;
      const user = { uid: "demo-" + Date.now(), displayName: name, email, role };
      localStorage.setItem("demoUser", JSON.stringify(user));
      currentUser = user;
      currentUserRole = role;
      updateAuthUI(user);
      showToast(`Welcome, ${name}! (Demo Mode)`);
      navigateTo("dashboard");
      newSignup.reset();
    });
  }

  // Override login form
  if (loginForm) {
    const newLogin = loginForm.cloneNode(true);
    loginForm.parentNode.replaceChild(newLogin, loginForm);
    newLogin.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = newLogin.querySelector("#login-email").value.trim();
      const name = email.split("@")[0];
      const user = { uid: "demo-" + Date.now(), displayName: name, email, role: "customer" };
      localStorage.setItem("demoUser", JSON.stringify(user));
      currentUser = user;
      currentUserRole = "customer";
      updateAuthUI(user);
      showToast(`Welcome back, ${name}! (Demo Mode)`);
      navigateTo("dashboard");
      newLogin.reset();
    });
  }

  // Override logout
  if (logoutBtn) {
    const newLogout = logoutBtn.cloneNode(true);
    logoutBtn.parentNode.replaceChild(newLogout, logoutBtn);
    newLogout.addEventListener("click", () => {
      localStorage.removeItem("demoUser");
      currentUser = null;
      currentUserRole = "customer";
      idToken = null;
      updateAuthUI(null);
      showToast("Logged out (Demo Mode)");
      navigateTo("home");
    });
  }
}

// ════════════════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", async () => {
  await checkBackend();
  navigateTo("home");
});

const bookFormHero = $("#book-form-hero");
if (bookFormHero) {
  bookFormHero.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentUser) {
      showToast("Please log in first", "error");
      navigateTo("login");
      return;
    }
    const deviceType = $("#book-device-hero").value;
    const deviceModel = $("#book-model-hero").value;
    const problem = $("#book-problem-hero").value.trim();

    // Store temporarily and redirect to book page
    sessionStorage.setItem("draftDevice", deviceType);
    sessionStorage.setItem("draftDeviceModel", deviceModel);
    sessionStorage.setItem("draftProblem", problem);

    navigateTo("book");
    const mainDeviceSelect = $("#book-device");
    const mainModelSelect = $("#book-model");
    const mainProblemArea = $("#book-problem");
    if (mainDeviceSelect) {
      mainDeviceSelect.value = deviceType;
      mainDeviceSelect.dispatchEvent(new Event("change"));
    }
    if (mainModelSelect) mainModelSelect.value = deviceModel;
    if (mainProblemArea) mainProblemArea.value = problem;
  });
}

const trackBtnHome = $("#track-btn-home");
const trackInputHome = $("#track-input-home");
if (trackBtnHome) {
  trackBtnHome.addEventListener("click", () => {
    const rid = trackInputHome.value.trim();
    if (rid) {
      navigateTo("track");
      $("#track-input").value = rid;
      $("#track-btn").click();
    }
  });
}
