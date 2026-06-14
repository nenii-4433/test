let product = null;
let quantity = parseInt(sessionStorage.getItem("quantity") || "1", 10);

const form = document.getElementById("checkout-form");
const payBtn = document.getElementById("pay-btn");
const alertBox = document.getElementById("alert-box");

function showAlert(message, type = "error") {
  alertBox.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
}

function formatPrice(amount, currency = "PKR") {
  const code = currency.toUpperCase();
  const value = code === "USD" ? amount / 100 : amount;
  return new Intl.NumberFormat("en-PK", { style: "currency", currency: code }).format(value);
}

function updateSummary() {
  if (!product) return;
  const subtotal = product.price * quantity;
  document.getElementById("summary-name").textContent = product.name;
  document.getElementById("summary-qty").textContent = "Qty: " + quantity;
  document.getElementById("summary-subtotal").textContent = formatPrice(subtotal, product.currency);
  document.getElementById("summary-total").textContent = formatPrice(subtotal, product.currency);
  if (product.image) {
    document.getElementById("summary-image").src = product.image;
  }
}

// Show cancelled message
if (new URLSearchParams(window.location.search).get("cancelled")) {
  showAlert("Payment was cancelled. You can try again when ready.", "info");
}

fetch("/api/config")
  .then((r) => r.json())
  .then((data) => {
    product = data.product;
    updateSummary();
  });

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  payBtn.disabled = true;
  payBtn.textContent = "Redirecting to payment...";
  alertBox.innerHTML = "";

  const payload = {
    name: document.getElementById("name").value.trim(),
    email: document.getElementById("email").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    address: document.getElementById("address").value.trim(),
    city: document.getElementById("city").value.trim(),
    state: document.getElementById("state").value.trim(),
    zip: document.getElementById("zip").value.trim(),
    country: document.getElementById("country").value,
    quantity,
  };

  try {
    const res = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) {
      showAlert(data.error || "Something went wrong. Please try again.");
      payBtn.disabled = false;
      payBtn.textContent = "Proceed to Payment";
      return;
    }

    window.location.href = data.url;
  } catch {
    showAlert("Network error. Please check your connection and try again.");
    payBtn.disabled = false;
    payBtn.textContent = "Proceed to Payment";
  }
});
