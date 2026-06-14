const TOKEN_KEY = "admin_token";

const loginSection = document.getElementById("login-section");
const dashboardSection = document.getElementById("dashboard-section");
const logoutBtn = document.getElementById("logout-btn");

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function authHeaders() {
  return { Authorization: "Bearer " + getToken(), "Content-Type": "application/json" };
}

function showDashboard() {
  loginSection.style.display = "none";
  dashboardSection.style.display = "block";
  logoutBtn.style.display = "inline-flex";
  loadDashboard();
}

function showLogin() {
  loginSection.style.display = "block";
  dashboardSection.style.display = "none";
  logoutBtn.style.display = "none";
}

function formatPrice(amount, currency = "PKR") {
  const code = (currency || "PKR").toUpperCase();
  const value = code === "USD" ? amount / 100 : amount;
  return new Intl.NumberFormat("en-PK", { style: "currency", currency: code }).format(value);
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function statusBadge(status) {
  return `<span class="status-badge status-${status}">${status}</span>`;
}

async function loadStats() {
  const res = await fetch("/api/admin/stats", { headers: authHeaders() });
  if (!res.ok) { showLogin(); return; }
  const stats = await res.json();
  document.getElementById("stat-total").textContent = stats.totalOrders;
  document.getElementById("stat-paid").textContent = stats.paidOrders;
  document.getElementById("stat-revenue").textContent = formatPrice(stats.totalRevenue, "PKR");
  document.getElementById("stat-pending").textContent = stats.pendingOrders;
}

async function loadOrders() {
  const res = await fetch("/api/admin/orders", { headers: authHeaders() });
  if (!res.ok) { showLogin(); return; }
  const orders = await res.json();
  const tbody = document.getElementById("orders-body");

  if (orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No orders yet.</td></tr>';
    return;
  }

  const statuses = ["pending", "paid", "processing", "shipped", "delivered", "cancelled"];

  tbody.innerHTML = orders.map((o) => `
    <tr>
      <td><code>${o.orderId}</code></td>
      <td>
        <strong>${o.name}</strong><br>
        <span style="color:var(--text-muted);font-size:0.8rem">${o.email}</span><br>
        <span style="color:var(--text-dim);font-size:0.75rem">${o.address}, ${o.city}</span>
      </td>
      <td>${o.productName}</td>
      <td>${o.quantity}</td>
      <td>${formatPrice(o.total, o.currency)}</td>
      <td>${statusBadge(o.status)}</td>
      <td style="font-size:0.8rem;color:var(--text-muted)">${formatDate(o.createdAt)}</td>
      <td>
        <select class="status-select" data-order-id="${o.orderId}">
          ${statuses.map((s) => `<option value="${s}" ${s === o.status ? "selected" : ""}>${s}</option>`).join("")}
        </select>
      </td>
    </tr>
  `).join("");

  tbody.querySelectorAll(".status-select").forEach((sel) => {
    sel.addEventListener("change", async () => {
      const orderId = sel.dataset.orderId;
      const status = sel.value;
      await fetch("/api/admin/orders/" + orderId, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ status }),
      });
      loadStats();
    });
  });
}

async function loadDashboard() {
  await Promise.all([loadStats(), loadOrders()]);
}

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const password = document.getElementById("password").value;
  const errorEl = document.getElementById("login-error");

  try {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();

    if (!res.ok) {
      errorEl.innerHTML = '<div class="alert alert-error" style="margin-bottom:16px">Invalid password.</div>';
      return;
    }

    setToken(data.token);
    showDashboard();
  } catch {
    errorEl.innerHTML = '<div class="alert alert-error" style="margin-bottom:16px">Connection error.</div>';
  }
});

logoutBtn.addEventListener("click", () => {
  clearToken();
  showLogin();
});

document.getElementById("refresh-btn").addEventListener("click", loadDashboard);

if (getToken()) {
  showDashboard();
}
