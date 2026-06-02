// ============================================================
// js/auth.js — Login, Session & Logout Handler
// ============================================================

// ── Helper ambil role ─────────────────────────────────────────
function getUserRole() {
  const user = getUser();
  if (!user) return null;
  return user.userRole || user.role || null;
}

document.addEventListener("DOMContentLoaded", () => {
  if (isLoggedIn() && window.location.pathname.includes("login")) {
    redirectByRole(getUserRole());
    return;
  }

  const form = document.getElementById("login-form");
  if (form) form.addEventListener("submit", handleLogin);

  const btnLogout = document.getElementById("btn-logout");
  if (btnLogout) btnLogout.addEventListener("click", handleLogout);

  renderUserInfo();
});

// ── Handle Login ──────────────────────────────────────────────
async function handleLogin(e) {
  e.preventDefault();

  const email    = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const btnLogin = document.getElementById("btn-login");
  const errMsg   = document.getElementById("error-message");

  if (!email || !password) {
    showFieldError(errMsg, "Email dan password wajib diisi.");
    return;
  }

  btnLogin.disabled    = true;
  btnLogin.textContent = "Memuat...";
  if (errMsg) errMsg.textContent = "";

  try {
    const result = await Auth.login(email, password);

    if (result.success) {
      saveSession(result.token, result.user);
      showSuccess("Login berhasil! Mengalihkan...");
      const role = result.user.userRole || result.user.role;
      setTimeout(() => redirectByRole(role), 800);
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
  if (!window.confirm("Yakin ingin keluar?")) return;
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
  window.location.href = "dashboard.html";
}

// ── Render User Info ──────────────────────────────────────────
function renderUserInfo() {
  const user = getUser();
  if (!user) return;

  const role = user.userRole || user.role || "";
  const nama = user.userName || user.name || "User";

  const elName = document.getElementById("user-name");
  if (elName) elName.textContent = nama;

  const elRole = document.getElementById("user-role");
  if (elRole) {
    elRole.textContent = role;
    elRole.className   = "role-badge role-" + role.toLowerCase();
  }

  const elAvatar = document.getElementById("user-avatar");
  if (elAvatar) elAvatar.textContent = nama.charAt(0).toUpperCase();
}

// ── Render Sidebar ────────────────────────────────────────────
function renderSidebar() {
  const user = getUser();
  if (!user) {
    // Jika user belum tersedia, coba lagi setelah DOM siap
    if (document.readyState !== "complete") {
      window.addEventListener("load", renderSidebar);
    }
    return;
  }

  const role    = user.userRole || user.role || "";
  const sidebar = document.getElementById("sidebar-menu");
  if (!sidebar) return;

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

  const allowed    = menus.filter(m => m.roles.includes(role));
  const currentPage = window.location.pathname.split("/").pop();

  sidebar.innerHTML = allowed.map(m => `
    <a href="${m.href}"
       class="sidebar-item ${currentPage === m.href ? "active" : ""}">
      <span class="sidebar-icon">${m.icon}</span>
      <span class="sidebar-label">${m.label}</span>
    </a>
  `).join("");
}

// ── Page Guard ────────────────────────────────────────────────
function initPage(allowedRoles = []) {
  if (!isLoggedIn()) {
    window.location.href = "login.html";
    return false;
  }

  const role = getUserRole();

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    showError("Akses ditolak. Anda tidak memiliki izin.");
    setTimeout(() => window.location.href = "dashboard.html", 1500);
    return false;
  }

  // Pastikan DOM sudah siap sebelum render sidebar & user info
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      renderSidebar();
      renderUserInfo();
    });
  } else {
    renderSidebar();
    renderUserInfo();
  }

  return true;
}

// ── UI Helpers ────────────────────────────────────────────────
function showFieldError(el, message) {
  if (!el) return;
  el.textContent   = message;
  el.style.display = "block";
}

function hideFieldError(el) {
  if (!el) return;
  el.textContent   = "";
  el.style.display = "none";
}
