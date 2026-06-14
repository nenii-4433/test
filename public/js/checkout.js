let product = null;
let quantity = parseInt(sessionStorage.getItem("quantity") || "1", 10);
let shippingCost = 200;

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

function getSelectedShirtName() {
  return sessionStorage.getItem("selectedShirt") || "RawTee Nike Print Shirt White";
}

function getSelectedImage() {
  return sessionStorage.getItem("selectedImage") || "/images/MZCHYHAM2551-media-1.jpg";
}

function getSelectedPricing() {
  const savedPrice = parseInt(sessionStorage.getItem("selectedPrice"), 10);
  const savedCompare = parseInt(sessionStorage.getItem("selectedCompareAt"), 10);
  if (savedPrice && savedCompare) {
    return { price: savedPrice, compareAt: savedCompare };
  }

  const shirtName = getSelectedShirtName();
  const match = product?.images?.find((img) => img.name === shirtName);
  if (match) return { price: match.price, compareAt: match.compareAt };

  const isPlain = shirtName.toLowerCase().includes("plain");
  return isPlain
    ? { price: 1900, compareAt: 2400 }
    : { price: 2000, compareAt: 3000 };
}

function updateSummary() {
  if (!product) return;
  const { price, compareAt } = getSelectedPricing();
  const subtotal = price * quantity;
  const compareTotal = compareAt * quantity;
  const total = subtotal + shippingCost;

  document.getElementById("summary-name").textContent = getSelectedShirtName();
  document.getElementById("summary-qty").textContent = "Qty: " + quantity;
  document.getElementById("summary-subtotal").textContent = formatPrice(subtotal, product.currency);
  document.getElementById("summary-shipping").textContent = formatPrice(shippingCost, product.currency);
  document.getElementById("summary-total").textContent = formatPrice(total, product.currency);
  document.getElementById("summary-image").src = getSelectedImage();

  const compareRow = document.getElementById("summary-compare-row");
  const compareEl = document.getElementById("summary-compare");
  const savingsEl = document.getElementById("summary-savings");
  if (compareRow && compareEl && savingsEl) {
    compareEl.textContent = formatPrice(compareTotal, product.currency);
    savingsEl.textContent = formatPrice(compareTotal - subtotal, product.currency);
    compareRow.style.display = compareTotal > subtotal ? "flex" : "none";
  }
}

if (new URLSearchParams(window.location.search).get("cancelled")) {
  showAlert("Payment was cancelled. You can try again when ready.", "info");
}

fetch("/api/config")
  .then((r) => r.json())
  .then((data) => {
    product = data.product;
    if (product?.shipping) shippingCost = product.shipping;
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
    shirtName: getSelectedShirtName(),
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
      payBtn.textContent = "Secure the Fit →";
      return;
    }

    window.location.href = data.url;
  } catch {
    showAlert("Network error. Please check your connection and try again.");
    payBtn.disabled = false;
    payBtn.textContent = "Secure the Fit →";
  }
});
