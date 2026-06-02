// ============================================================
// js/auth.js — Login, Session & Logout Handler
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  // Kalau sudah login, redirect ke dashboard
  if (isLoggedIn() && window.location.pathname.includes("login")) {
    redirectByRole(getUser().userRole);
    return;
  }

  // Setup form login
  const form = document.getElementById("login-form");
  if (form) {
    form.addEventListener("submit", handleLogin);
  }

  // Setup tombol logout di semua halaman
  const btnLogout = document.getElementById("btn-logout");
  if (btnLogout) {
    btnLogout.addEventListener("click", handleLogout);
  }

  // Render user info di navbar
  renderUserInfo();
});

// ── Handle Login ──────────────────────────────────────────────
async function handleLogin(e) {
  e.preventDefault();

  const email    = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const btnLogin = document.getElementById("btn-login");
  const errMsg   = document.getElementById("error-message");

  // Validasi input
  if (!email || !password) {
    showFieldError(errMsg, "Email dan password wajib diisi.");
    return;
  }

  // Loading state
  btnLogin.disabled    = true;
  btnLogin.textContent = "Memuat...";
  if (errMsg) errMsg.textContent = "";

  try {
    const result = await Auth.login(email, password);

    if (result.success) {
      // Simpan session
      saveSession(result.token, result.user);
      showSuccess("Login berhasil! Mengalihkan...");

      // Redirect sesuai role
      setTimeout(() => redirectByRole(result.user.role), 800);

    } else {
      showFieldError(errMsg, result.message || "Login gagal.");
      btnLogin.disabled    = false;
      btnLogin.textContent = "Masuk";
    }

  } catch (err) {
    showFieldError(errMsg, "Terjadi kesalahan. Coba lagi.");
    btnLogin.disabled    = false;
    btnLogin.textContent = "Masuk";
  }
}

// ── Handle Logout ─────────────────────────────────────────────
async function handleLogout() {
  const confirm = window.confirm("Yakin ingin keluar?");
  if (!confirm) return;

  showLoading("Keluar dari sistem...");

  try {
    await Auth.logout();
  } catch {
    clearSession();
    window.location.href = "login.html";
  }
}

// ── Redirect by Role ──────────────────────────────────────────
function redirectByRole(role) {
  const map = {
    "ADMIN":    "dashboard.html",
    "PMB":      "dashboard.html",
    "KEUANGAN": "dashboard.html",
    "AKADEMIK": "dashboard.html",
    "PIMPINAN": "dashboard.html",
    "YAYASAN":  "dashboard.html",
  };
  window.location.href = map[role] || "dashboard.html";
}

// ── Render User Info di Navbar ────────────────────────────────
function renderUserInfo() {
  const user = getUser();
  if (!user) return;

  // Nama user
  const elName = document.getElementById("user-name");
  if (elName) elName.textContent = user.userName || user.name;

  // Role badge
  const elRole = document.getElementById("user-role");
  if (elRole) {
    elRole.textContent  = user.userRole || user.role;
    elRole.className    = "role-badge role-" +
                          (user.userRole || user.role).toLowerCase();
  }

  // Inisial avatar
  const elAvatar = document.getElementById("user-avatar");
  if (elAvatar) {
    const nama = user.userName || user.name || "?";
    elAvatar.textContent = nama.charAt(0).toUpperCase();
  }
}

// ── Render Sidebar Menu by Role ───────────────────────────────
function renderSidebar() {
  const user = getUser();
  if (!user) return;

  const role    = user.userRole || user.role;
  const sidebar = document.getElementById("sidebar-menu");
  if (!sidebar) return;

  // Menu items per role
  const menus = [
    {
      icon:  "📊",
      label: "Dashboard",
      href:  "dashboard.html",
      roles: ["ADMIN","PMB","KEUANGAN","AKADEMIK","PIMPINAN","YAYASAN"],
    },
    {
      icon:  "📋",
      label: "Data Camaba",
      href:  "camaba.html",
      roles: ["ADMIN","PMB","KEUANGAN","AKADEMIK","PIMPINAN","YAYASAN"],
    },
    {
      icon:  "📁",
      label: "Berkas",
      href:  "berkas.html",
      roles: ["ADMIN","PMB","AKADEMIK","PIMPINAN","YAYASAN"],
    },
    {
      icon:  "💰",
      label: "Pembayaran",
      href:  "pembayaran.html",
      roles: ["ADMIN","PMB","KEUANGAN","AKADEMIK","PIMPINAN","YAYASAN"],
    },
    {
      icon:  "🪪",
      label: "Rilis NIM",
      href:  "nim.html",
      roles: ["ADMIN","AKADEMIK","PMB","PIMPINAN","YAYASAN"],
    },
    {
      icon:  "📜",
      label: "Generate Surat",
      href:  "surat.html",
      roles: ["ADMIN","PMB","AKADEMIK"],
    },
    {
      icon:  "⚙️",
      label: "Admin Panel",
      href:  "admin.html",
      roles: ["ADMIN"],
    },
  ];

  // Filter menu sesuai role
  const allowed = menus.filter(m => m.roles.includes(role));

  // Render HTML
  const currentPage = window.location.pathname.split("/").pop();
  sidebar.innerHTML = allowed.map(m => `
    <a href="${m.href}"
       class="sidebar-item ${currentPage === m.href ? 'active' : ''}">
      <span class="sidebar-icon">${m.icon}</span>
      <span class="sidebar-label">${m.label}</span>
    </a>
  `).join("");
}

// ── Page Guard ────────────────────────────────────────────────
function initPage(allowedRoles = []) {
  // Cek login
  if (!isLoggedIn()) {
    window.location.href = "login.html";
    return false;
  }

  // Cek role
  if (allowedRoles.length > 0 && !hasRole(...allowedRoles)) {
    showError("Akses ditolak. Anda tidak memiliki izin.");
    setTimeout(() => window.location.href = "dashboard.html", 1500);
    return false;
  }

  // Render sidebar & user info
  renderSidebar();
  renderUserInfo();

  return true;
}

// ── UI Helpers ────────────────────────────────────────────────
function showFieldError(el, message) {
  if (!el) return;
  el.textContent  = message;
  el.style.display = "block";
}

function hideFieldError(el) {
  if (!el) return;
  el.textContent   = "";
  el.style.display = "none";
}
