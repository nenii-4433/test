const mainImage = document.getElementById("product-image");
const captionEl = document.getElementById("gallery-caption");
const titleEl = document.getElementById("product-name");
const descEl = document.getElementById("product-desc");
const priceEl = document.getElementById("product-price");
const compareEl = document.getElementById("product-price-compare");
const discountEl = document.getElementById("price-discount");
const buyBtn = document.getElementById("buy-btn");
const thumbs = document.querySelectorAll(".gallery-thumb");

function formatPrice(amount) {
  return new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR" }).format(amount);
}

function updatePriceDisplay(price, compareAt) {
  if (priceEl) priceEl.textContent = formatPrice(price);
  if (compareEl) compareEl.textContent = formatPrice(compareAt);
  if (discountEl) {
    const saved = compareAt - price;
    discountEl.textContent = saved > 0 ? `Save ${formatPrice(saved)}` : "Insane value";
  }
}

function saveSelection(name, src, desc, price, compareAt) {
  sessionStorage.setItem("selectedShirt", name);
  sessionStorage.setItem("selectedImage", src);
  if (desc) sessionStorage.setItem("selectedDesc", desc);
  if (price) sessionStorage.setItem("selectedPrice", price);
  if (compareAt) sessionStorage.setItem("selectedCompareAt", compareAt);
}

function selectShirt(thumb) {
  const src = thumb.dataset.src;
  const name = thumb.dataset.name;
  const desc = thumb.dataset.desc;
  const price = parseInt(thumb.dataset.price, 10);
  const compareAt = parseInt(thumb.dataset.compare, 10);
  if (!src || !mainImage) return;

  mainImage.style.opacity = "0";
  setTimeout(() => {
    mainImage.src = src;
    mainImage.alt = name || "";
    mainImage.style.opacity = "1";
  }, 150);

  if (captionEl && name) captionEl.textContent = name;
  if (titleEl && name) titleEl.textContent = name;
  if (descEl && desc) descEl.textContent = desc;
  if (price && compareAt) updatePriceDisplay(price, compareAt);
  saveSelection(name, src, desc, price, compareAt);

  thumbs.forEach((t) => t.classList.remove("active"));
  thumb.classList.add("active");
}

thumbs.forEach((thumb) => {
  thumb.addEventListener("click", () => selectShirt(thumb));
});

if (buyBtn) {
  buyBtn.addEventListener("click", () => {
    const active = document.querySelector(".gallery-thumb.active");
    if (active) {
      saveSelection(
        active.dataset.name,
        active.dataset.src,
        active.dataset.desc,
        active.dataset.price,
        active.dataset.compare
      );
    }
  });
}

// FAQ accordion
document.querySelectorAll(".faq-question").forEach((btn) => {
  btn.addEventListener("click", () => {
    const item = btn.parentElement;
    const wasOpen = item.classList.contains("open");
    document.querySelectorAll(".faq-item").forEach((i) => i.classList.remove("open"));
    if (!wasOpen) item.classList.add("open");
  });
});

// Sync descriptions & prices from API
fetch("/api/config")
  .then((r) => r.json())
  .then((data) => {
    const product = data.product;
    if (!product) return;

    if (product.images?.length) {
      product.images.forEach((item) => {
        const thumb = [...thumbs].find((t) => t.dataset.src === item.src);
        if (!thumb) return;
        if (item.description) thumb.dataset.desc = item.description;
        if (item.price) thumb.dataset.price = item.price;
        if (item.compareAt) thumb.dataset.compare = item.compareAt;
      });
      const active = document.querySelector(".gallery-thumb.active");
      if (active) selectShirt(active);
    }
  })
  .catch(() => {});

// Restore last selected shirt if returning to page
const savedName = sessionStorage.getItem("selectedShirt");
const savedImage = sessionStorage.getItem("selectedImage");
if (savedName && savedImage) {
  const match = [...thumbs].find((t) => t.dataset.src === savedImage);
  if (match) selectShirt(match);
}
