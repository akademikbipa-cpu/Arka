// ============================================================
// js/api.js — Core API Caller ke GAS Backend
// ============================================================

const API_URL = "https://script.google.com/macros/s/AKfycbwzpaSi-8JkT5SC3qRVCdp-kUP777W5SKl8qXbN2eswsBUkxzwmTdMdUrVR1v2j3jjzZA/exec";

// ── Core Fetch ────────────────────────────────────────────────
async function apiCall(action, data = {}, token = null) {
  const payload = {
    action: action,
    data:   data,
    token:  token || getToken(),
  };

  try {
    const response = await fetch(API_URL, {
      method:  "POST",
      headers: { "Content-Type": "text/plain" },
      body:    JSON.stringify(payload),
    });

    const result = await response.json();
    return result;

  } catch (error) {
    console.error("API Error [" + action + "]:", error);
    return {
      success: false,
      message: "Koneksi ke server gagal. Periksa koneksi internet.",
    };
  }
}

// ── Session Management ────────────────────────────────────────
function saveSession(token, user) {
  localStorage.setItem("arka_token", token);
  localStorage.setItem("arka_user",  JSON.stringify(user));
}

function getToken() {
  return localStorage.getItem("arka_token") || "";
}

function getUser() {
  const raw = localStorage.getItem("arka_user");
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function clearSession() {
  localStorage.removeItem("arka_token");
  localStorage.removeItem("arka_user");
}

function isLoggedIn() {
  return !!getToken() && !!getUser();
}

// ── Auth Guard ────────────────────────────────────────────────
// Panggil di setiap halaman (kecuali login.html)
function requireAuth(allowedRoles = []) {
  if (!isLoggedIn()) {
    window.location.href = "login.html";
    return false;
  }
  if (allowedRoles.length > 0) {
    const user = getUser();
    if (!allowedRoles.includes(user.userRole)) {
      window.location.href = "unauthorized.html";
      return false;
    }
  }
  return true;
}

// ── Role Check ────────────────────────────────────────────────
function hasRole(...roles) {
  const user = getUser();
  if (!user) return false;
  return roles.includes(user.userRole);
}

function isAdmin()    { return hasRole("ADMIN"); }
function isPMB()      { return hasRole("ADMIN", "PMB"); }
function isKeuangan() { return hasRole("ADMIN", "KEUANGAN"); }
function isAkademik() { return hasRole("ADMIN", "AKADEMIK"); }
function isReadOnly() { return hasRole("PIMPINAN", "YAYASAN"); }

// ── API Methods ───────────────────────────────────────────────

// AUTH
const Auth = {
  login: (email, password) =>
    apiCall("LOGIN", { email, password }),

  logout: async () => {
    await apiCall("LOGOUT");
    clearSession();
    window.location.href = "login.html";
  },

  changePassword: (oldPassword, newPassword) =>
    apiCall("CHANGE_PASSWORD", { oldPassword, newPassword }),
};

// DASHBOARD
const Dashboard = {
  get: () => apiCall("GET_DASHBOARD"),
};

// CAMABA
const Camaba = {
  getAll:  ()        => apiCall("GET_ALL_CAMABA"),
  getById: (id)      => apiCall("GET_CAMABA",    { id }),
  add:     (data)    => apiCall("ADD_CAMABA",    data),
  update:  (id,data) => apiCall("UPDATE_CAMABA", { id, ...data }),
  delete:  (id)      => apiCall("DELETE_CAMABA", { id }),
};

// BERKAS
const Berkas = {
  get:    (camabaId)      => apiCall("GET_BERKAS",    { camabaId }),
  update: (camabaId,data) => apiCall("UPDATE_BERKAS", { camabaId, ...data }),
  notifBaak: ()           => apiCall("GET_NOTIF_BAAK"),
};

// PEMBAYARAN
const Pembayaran = {
  get:    (camabaId)      => apiCall("GET_PEMBAYARAN",    { camabaId }),
  update: (camabaId,data) => apiCall("UPDATE_PEMBAYARAN", { camabaId, ...data }),
};

// NIM
const Nim = {
  getList: ()                           => apiCall("GET_NIM_LIST"),
  release: (camabaId, nim, overrideCode) =>
    apiCall("RELEASE_NIM", { camabaId, nim, overrideCode }),
};

// SURAT
const Surat = {
  generate1: (camabaId)  => apiCall("GENERATE_SURAT1", { camabaId }),
  generate2: (camabaId)  => apiCall("GENERATE_SURAT2", { camabaId }),
  generate3: (filters)   => apiCall("GENERATE_SURAT3", { filters }),
};

// MASTER
const Master = {
  get:    (type)          => apiCall("GET_MASTER",    { type }),
  add:    (type, row)     => apiCall("ADD_MASTER",    { type, row }),
  update: (type, id, row) => apiCall("UPDATE_MASTER", { type, id, row }),
};

// USERS (Admin only)
const Users = {
  getAll:         ()          => apiCall("GET_USERS"),
  add:            (data)      => apiCall("ADD_USER",       data),
  update:         (id, data)  => apiCall("UPDATE_USER",    { id, ...data }),
  resetPassword:  (userId)    => apiCall("RESET_PASSWORD", { userId }),
  setOverrideCode:(code)      => apiCall("SET_OVERRIDE_CODE", { code }),
};

// ── UI Helpers ────────────────────────────────────────────────
function showLoading(message = "Memuat...") {
  const el = document.getElementById("loading-overlay");
  if (el) {
    el.querySelector(".loading-text").textContent = message;
    el.classList.remove("hidden");
  }
}

function hideLoading() {
  const el = document.getElementById("loading-overlay");
  if (el) el.classList.add("hidden");
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = "toast toast-" + type;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showError(message) { showToast(message, "error"); }
function showSuccess(message) { showToast(message, "success"); }
function showWarning(message) { showToast(message, "warning"); }

// ── Format Helpers ────────────────────────────────────────────
function formatRupiah(angka) {
  if (!angka) return "Rp 0";
  return "Rp " + Number(angka).toLocaleString("id-ID");
}

function formatTanggal(dateStr) {
  if (!dateStr) return "-";
  const bulan = ["Jan","Feb","Mar","Apr","Mei","Jun",
                 "Jul","Agu","Sep","Okt","Nov","Des"];
  const d = new Date(dateStr);
  return d.getDate() + " " + bulan[d.getMonth()] + " " + d.getFullYear();
}

function getStatusBadge(status) {
  const map = {
    "DAFTAR":         "badge-gray",
    "PEMBERKASAN":    "badge-yellow",
    "VERIFIKASI":     "badge-blue",
    "LENGKAP":        "badge-green",
    "NIM RILIS":      "badge-darkgreen",
    "BELUM ADA":      "badge-red",
    "TIDAK LENGKAP":  "badge-yellow",
    "BELUM BAYAR":    "badge-red",
    "BAYAR SEBAGIAN": "badge-yellow",
    "LUNAS":          "badge-green",
  };
  return `<span class="badge ${map[status] || 'badge-gray'}">${status}</span>`;
}
