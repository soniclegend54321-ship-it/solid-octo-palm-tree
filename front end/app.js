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
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDPlaceholderKeyHere",          // ← Replace with your real Firebase Web API key
  authDomain: "electronic-repair-hub.firebaseapp.com",
  projectId: "electronic-repair-hub",
  storageBucket: "electronic-repair-hub.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:placeholder",
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

const pages       = $$(".page");
const navLinks    = $$(".nav__link");
const authBtns    = $("#auth-buttons");
const userMenu    = $("#user-menu");
const userInitials = $("#user-initials");
const toast       = $("#toast");
const nav         = $("#main-nav");
const burgerBtn   = $("#burger-btn");
const navLinksUl  = $("#nav-links");

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
  }
}

// Attach click handlers for all [data-page] elements
document.addEventListener("click", (e) => {
  const trigger = e.target.closest("[data-page]");
  if (trigger) {
    e.preventDefault();
    const page = trigger.dataset.page;
    if (["dashboard", "book"].includes(page) && !currentUser) {
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
function animateCounters() {
  $$("[data-count]").forEach((el) => {
    const target = parseInt(el.dataset.count, 10);
    const duration = 2000;
    const step = target / (duration / 16);
    let current = 0;
    const timer = setInterval(() => {
      current += step;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      el.textContent = Math.floor(current).toLocaleString();
    }, 16);
  });
}

const heroStats = $(".hero__stats");
if (heroStats) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounters();
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );
  observer.observe(heroStats);
}

// ════════════════════════════════════════════════════════
//  AUTHENTICATION
// ════════════════════════════════════════════════════════
function updateAuthUI(user) {
  if (user) {
    authBtns.classList.add("hidden");
    userMenu.classList.remove("hidden");
    const initials = (user.displayName || user.email || "U")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
    userInitials.textContent = initials;
  } else {
    authBtns.classList.remove("hidden");
    userMenu.classList.add("hidden");
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
    } else {
      idToken = null;
      currentUserRole = "customer";
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
          body: JSON.stringify({ deviceType, problem, address, phone }),
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
          problem,
          address,
          phone,
          status: "requested",
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

function renderStatusTimeline(currentStatus) {
  const idx = STATUS_ORDER.indexOf(currentStatus);
  return `
    <div class="status-timeline">
      ${STATUS_ORDER.map((s, i) => {
        let cls = "";
        if (i < idx) cls = "status-step--done";
        else if (i === idx) cls = "status-step--active";
        return `
          <div class="status-step ${cls}">
            <div class="status-step__dot">${i < idx ? "✓" : i + 1}</div>
            <span class="status-step__label">${STATUS_LABELS[s]}</span>
          </div>`;
      }).join("")}
    </div>`;
}

function getStatusBadgeClass(status) {
  return `status-badge status-badge--${status}`;
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
      const deviceIcons = { mobile: "📱", laptop: "💻", computer: "🖥️", television: "📺", other: "🎮" };
      const createdDate = found.createdAt instanceof Date
        ? found.createdAt.toLocaleDateString()
        : new Date(found.createdAt).toLocaleDateString();

      trackResult.classList.remove("hidden");
      trackResult.innerHTML = `
        <div class="track-result__card">
          <div class="track-result__header">
            <span class="track-result__id">${found.repairId}</span>
            <span class="${getStatusBadgeClass(found.status)}">${STATUS_LABELS[found.status] || found.status}</span>
          </div>
          <div class="track-result__info">
            <div class="track-result__field">
              <label>Device</label>
              <p>${deviceIcons[found.deviceType] || "🔧"} ${found.deviceType?.charAt(0).toUpperCase() + found.deviceType?.slice(1)}</p>
            </div>
            <div class="track-result__field">
              <label>Customer</label>
              <p>${found.customerName || "—"}</p>
            </div>
            <div class="track-result__field">
              <label>Problem</label>
              <p>${found.problem}</p>
            </div>
            <div class="track-result__field">
              <label>Submitted</label>
              <p>${createdDate}</p>
            </div>
          </div>
          ${renderStatusTimeline(found.status)}
        </div>`;
    } else {
      trackResult.classList.remove("hidden");
      trackResult.innerHTML = `
        <div class="track-result__card" style="text-align:center;padding:40px">
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
    greeting.textContent = `Welcome back, ${currentUser.displayName || currentUser.email}!`;
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
    myRequestsEl.innerHTML = "";
    noRequestsEl.classList.remove("hidden");
  } else {
    noRequestsEl.classList.add("hidden");
    myRequestsEl.innerHTML = requests.map((r) => renderRequestCard(r, false)).join("");
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
    container.innerHTML = `<p style="color:var(--text-muted);padding:20px">No open requests right now.</p>`;
  } else {
    container.innerHTML = requests.map((r) => renderRequestCard(r, true)).join("");
    // Attach accept handlers
    container.querySelectorAll(".accept-request-btn").forEach((btn) => {
      btn.addEventListener("click", () => acceptRequest(btn.dataset.id, btn.dataset.repairId));
    });
  }
}

function renderRequestCard(r, showAccept = false) {
  const deviceIcons = { mobile: "📱", laptop: "💻", computer: "🖥️", television: "📺", other: "🎮" };
  const createdDate = r.createdAt instanceof Date
    ? r.createdAt.toLocaleDateString()
    : new Date(r.createdAt).toLocaleDateString();

  // For technician dashboard: show status update controls
  const isTech = (currentUserRole === "technician" || currentUserRole === "admin");
  const isAssigned = r.technicianId === currentUser?.uid;
  const canUpdateStatus = isTech && isAssigned && r.status !== "completed";

  let statusControls = "";
  if (canUpdateStatus) {
    const currentIdx = STATUS_ORDER.indexOf(r.status);
    const nextStatus = STATUS_ORDER[currentIdx + 1];
    if (nextStatus) {
      statusControls = `<button class="btn btn--primary btn--sm update-status-btn" data-id="${r.id}" data-status="${nextStatus}" data-repair-id="${r.repairId}">→ ${STATUS_LABELS[nextStatus]}</button>`;
    }
  }

  return `
    <div class="request-card">
      <div class="request-card__header">
        <span class="request-card__id">${r.repairId}</span>
        <span class="${getStatusBadgeClass(r.status)}">${STATUS_LABELS[r.status] || r.status}</span>
      </div>
      <div class="request-card__body">
        <div class="request-card__device">${deviceIcons[r.deviceType] || "🔧"} ${r.deviceType?.charAt(0).toUpperCase() + r.deviceType?.slice(1)}</div>
        <div class="request-card__problem">${r.problem}</div>
      </div>
      <div class="request-card__footer">
        <span class="request-card__date">${createdDate}</span>
        ${showAccept ? `<button class="btn btn--primary btn--sm accept-request-btn" data-id="${r.id}" data-repair-id="${r.repairId}">Accept</button>` : ""}
        ${statusControls}
        ${!showAccept && !canUpdateStatus && r.status !== "completed" ? renderMiniStatus(r.status) : ""}
      </div>
    </div>`;
}

function renderMiniStatus(status) {
  const idx = STATUS_ORDER.indexOf(status);
  const total = STATUS_ORDER.length;
  const pct = ((idx + 1) / total) * 100;
  return `
    <div style="flex:1;max-width:180px">
      <div style="height:4px;background:var(--border);border-radius:4px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:var(--gradient-brand);border-radius:4px;transition:width .5s ease"></div>
      </div>
    </div>`;
}

async function acceptRequest(docId, repairId) {
  try {
    if (backendAvailable && idToken && docId) {
      await api(`/requests/${docId}/accept`, { method: "PATCH" });
    } else {
      // Offline demo
      const localRequests = JSON.parse(localStorage.getItem("repairRequests") || "[]");
      const idx = localRequests.findIndex((r) => r.repairId === repairId);
      if (idx !== -1) {
        localRequests[idx].status = "accepted";
        localRequests[idx].technicianId = currentUser?.uid || "tech-demo";
        localRequests[idx].technicianName = currentUser?.displayName || "Technician";
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
      problem: "Laptop is not powering on. Tried different chargers but no response.",
      address: "123 MG Road, Mumbai",
      phone: "+91 9876543210",
      status: "in-progress",
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
      problem: "Phone screen cracked after a drop. Touch not working on bottom half.",
      address: "123 MG Road, Mumbai",
      phone: "+91 9876543210",
      status: "requested",
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
      problem: "Smart TV keeps restarting randomly. Sometimes shows black screen.",
      address: "123 MG Road, Mumbai",
      phone: "+91 9876543210",
      status: "completed",
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
