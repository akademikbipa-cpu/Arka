// ============================================================
// js/api.js — Core API Caller ke GAS Backend (JSONP)
// ============================================================

const API_URL = "https://script.google.com/macros/s/AKfycbwzpaSi-8JkT5SC3qRVCdp-kUP777W5SKl8qXbN2eswsBUkxzwmTdMdUrVR1v2j3jjzZA/exec";

// ── Core API Call via JSONP (bypass CORS) ─────────────────────
function apiCall(action, data = {}, token = null) {
  return new Promise((resolve) => {
    const cbName = "arka_cb_" + Date.now() + "_" +
                   Math.random().toString(36).slice(2);

    const params = new URLSearchParams({
      action:   action,
      token:    token || getToken() || "",
      data:     JSON.stringify(data),
      callback: cbName,
    });

    const url    = API_URL + "?" + params.toString();
    const script = document.createElement("script");
    script.src   = url;

    const timeout = setTimeout(() => {
      cleanup();
      resolve({ success: false, message: "Request timeout. Coba lagi." });
    }, 30000);

    function cleanup() {
      clearTimeout(timeout);
      delete window[cbName];
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    window[cbName] = function(result) {
      cleanup();
      resolve(result);
    };

    script.onerror = function() {
      cleanup();
      resolve({ success: false, message: "Koneksi ke server gagal." });
    };

    document.head.appendChild(script);
  });
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
  getAll:  ()            => apiCall("GET_ALL_CAMABA"),
  getById: (id)          => apiCall("GET_CAMABA",    { id }),
  add:     (data)        => apiCall("ADD_CAMABA",    data),
  update:  (id, data)    => apiCall("UPDATE_CAMABA", { id, ...data }),
  delete:  (id)          => apiCall("DELETE_CAMABA", { id }),
};

// BERKAS
const Berkas = {
  get:      (camabaId)       => apiCall("GET_BERKAS",    { camabaId }),
  update:   (camabaId, data) => apiCall("UPDATE_BERKAS", { camabaId, ...data }),
  notifBaak: ()              => apiCall("GET_NOTIF_BAAK"),
};

// PEMBAYARAN
const Pembayaran = {
  get:    (camabaId)       => apiCall("GET_PEMBAYARAN",    { camabaId }),
  update: (camabaId, data) => apiCall("UPDATE_PEMBAYARAN", { camabaId, ...data }),
};

// NIM
const Nim = {
  getList: () =>
    apiCall("GET_NIM_LIST"),
  release: (camabaId, nim, overrideCode) =>
    apiCall("RELEASE_NIM", { camabaId, nim, overrideCode }),
};

// SURAT
const Surat = {
  generate1: (camabaId) => apiCall("GENERATE_SURAT1", { camabaId }),
  generate2: (camabaId) => apiCall("GENERATE_SURAT2", { camabaId }),
  generate3: (filters)  => apiCall("GENERATE_SURAT3", { filters }),
};

// MASTER
const Master = {
  get:    (type)           => apiCall("GET_MASTER",    { type }),
  add:    (type, row)      => apiCall("ADD_MASTER",    { type, row }),
  update: (type, id, row)  => apiCall("UPDATE_MASTER", { type, id, row }),
};

// USERS (Admin only)
const Users = {
  getAll:          ()         => apiCall("GET_USERS"),
  add:             (data)     => apiCall("ADD_USER",          data),
  update:          (id, data) => apiCall("UPDATE_USER",       { id, ...data }),
  resetPassword:   (userId)   => apiCall("RESET_PASSWORD",    { userId }),
  setOverrideCode: (code)     => apiCall("SET_OVERRIDE_CODE", { code }),
};

// ── UI Helpers ────────────────────────────────────────────────
function showLoading(message = "Memuat...") {
  const el = document.getElementById("loading-overlay");
  if (el) {
    const txt = el.querySelector(".loading-text");
    if (txt) txt.textContent = message;
    el.classList.remove("hidden");
  }
}

function hideLoading() {
  const el = document.getElementById("loading-overlay");
  if (el) el.classList.add("hidden");
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className  = "toast toast-" + type;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function showError(message)   { showToast(message, "error"); }
function showSuccess(message) { showToast(message, "success"); }
function showWarning(message) { showToast(message, "warning"); }

// ── Format Helpers ────────────────────────────────────────────
function formatRupiah(angka) {
  if (!angka && angka !== 0) return "Rp 0";
  return "Rp " + Number(angka).toLocaleString("id-ID");
}

function formatTanggal(dateStr) {
  if (!dateStr) return "-";
  const bulan = [
    "Jan","Feb","Mar","Apr","Mei","Jun",
    "Jul","Agu","Sep","Okt","Nov","Des",
  ];
  try {
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.getDate() + " " + bulan[d.getMonth()] + " " + d.getFullYear();
  } catch { return dateStr; }
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
    "AKTIF":          "badge-green",
    "DITAHAN":        "badge-yellow",
    "DIBATALKAN":     "badge-red",
  };
  return `<span class="badge ${map[status] || "badge-gray"}">${status || "-"}</span>`;
}

function getKelasLabel(kode) {
  const map = {
    "REG":  "Reguler",
    "PAR":  "Paralel",
    "FLEX": "Flex Class",
    "RPL":  "RPL",
  };
  return map[kode] || kode || "-";
}

function getProdiLabel(kode) {
  const map = {
    "11": "S1 Teknik Informatika",
    "22": "D3 Manajemen Informatika",
    "33": "S1 Sistem Informasi",
  };
  return map[kode] || kode || "-";
}

function getGelombangLabel(kode) {
  const map = {
    "GEL-2026-1": "Gelombang 1",
    "GEL-2026-2": "Gelombang 2",
    "GEL-2026-3": "Gelombang 3",
  };
  return map[kode] || kode || "-";
}

// ── Confirm Dialog ────────────────────────────────────────────
function confirmDialog(message) {
  return window.confirm(message);
}

// ── Debounce ──────────────────────────────────────────────────
function debounce(fn, delay = 300) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// ── Table Search Filter ───────────────────────────────────────
function filterTable(inputId, tableId) {
  const input = document.getElementById(inputId);
  const table = document.getElementById(tableId);
  if (!input || !table) return;

  input.addEventListener("input", debounce(function() {
    const keyword = this.value.toLowerCase();
    const rows    = table.querySelectorAll("tbody tr");
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(keyword) ? "" : "none";
    });
  }, 200));
}
