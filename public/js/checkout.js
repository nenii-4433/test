let product = null;
let quantity = parseInt(sessionStorage.getItem("quantity") || "1", 10);
let shippingCost = 200;

const form = document.getElementById("checkout-form");
const payBtn = document.getElementById("pay-btn");
const alertBox = document.getElementById("alert-box");
const sizeSelect = document.getElementById("size");

function showAlert(message, type = "error") {
  alertBox.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
}

function formatPrice(amount, currency = "PKR") {
  const code = currency.toUpperCase();
  const value = code === "USD" ? amount / 100 : amount;
  return new Intl.NumberFormat("en-PK", { style: "currency", currency: code }).format(value);
}

function getSelectedProductName() {
  return sessionStorage.getItem("selectedShirt") || "RawTee Nike Print Shirt White";
}

function getSelectedImage() {
  return sessionStorage.getItem("selectedImage") || "/images/MZCHYHAM2551-media-1.jpg";
}

function getSelectedSize() {
  return sizeSelect?.value || sessionStorage.getItem("selectedSize") || "";
}

function isTrousers(name) {
  return name.toLowerCase().includes("trouser");
}

function isGymWear(name) {
  return name.toLowerCase().includes("gym wear");
}

function getValidSizes(productName) {
  if (isGymWear(productName)) {
    return product?.gymWear?.sizes || ["S", "M", "L", "XL"];
  }
  if (isTrousers(productName) && product?.trousers?.variants) {
    const variant = product.trousers.variants.find((v) => productName.includes(v.color));
    return variant ? variant.sizes : product.trousers.variants[0].sizes;
  }
  return product?.sizes || ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];
}

function populateSizeSelect(productName, selectedSize) {
  if (!sizeSelect) return;
  const sizes = getValidSizes(productName);
  sizeSelect.innerHTML =
    '<option value="">Select size</option>' +
    sizes.map((s) => `<option value="${s}"${s === selectedSize ? " selected" : ""}>${s}</option>`).join("");
}

function getSelectedPricing() {
  const savedPrice = parseInt(sessionStorage.getItem("selectedPrice"), 10);
  const savedCompare = parseInt(sessionStorage.getItem("selectedCompareAt"), 10);
  if (savedPrice) {
    return { price: savedPrice, compareAt: savedCompare || savedPrice };
  }

  const productName = getSelectedProductName();
  if (isGymWear(productName)) {
    return { price: 2200, compareAt: 2200 };
  }
  if (isTrousers(productName)) {
    return { price: 3700, compareAt: 3700 };
  }

  const match = product?.images?.find((img) => img.name === productName);
  if (match) return { price: match.price, compareAt: match.compareAt };

  const isPlain = productName.toLowerCase().includes("plain");
  return isPlain
    ? { price: 1900, compareAt: 2400 }
    : { price: 2000, compareAt: 3000 };
}

function updateSummary() {
  if (!product) return;
  const productName = getSelectedProductName();
  const { price, compareAt } = getSelectedPricing();
  const subtotal = price * quantity;
  const compareTotal = compareAt * quantity;
  const total = subtotal + shippingCost;
  const size = getSelectedSize();

  document.getElementById("summary-name").textContent = productName;
  document.getElementById("summary-size").textContent = size ? `Size: ${size}` : "Size: —";
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

const savedSize = sessionStorage.getItem("selectedSize");
const savedProduct = getSelectedProductName();
populateSizeSelect(savedProduct, savedSize);
if (savedSize && sizeSelect) sizeSelect.value = savedSize;

if (sizeSelect) {
  sizeSelect.addEventListener("change", () => {
    sessionStorage.setItem("selectedSize", sizeSelect.value);
    updateSummary();
  });
}

fetchStoreConfig()
  .then((data) => {
    product = data.product;
    if (product?.shipping) shippingCost = product.shipping;
    populateSizeSelect(getSelectedProductName(), getSelectedSize());
    updateSummary();
  });

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const size = getSelectedSize();
  if (!size) {
    showAlert("Please select your size.");
    return;
  }

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
    shirtName: getSelectedProductName(),
    size,
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
      payBtn.textContent = "Complete order";
      return;
    }

    window.location.href = data.url;
  } catch {
    showAlert("Network error. Please check your connection and try again.");
    payBtn.disabled = false;
    payBtn.textContent = "Complete order";
  }
});
