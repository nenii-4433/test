const mainImage = document.getElementById("product-image");
const thumbs = document.querySelectorAll(".gallery-thumb");

thumbs.forEach((thumb) => {
  thumb.addEventListener("click", () => {
    const src = thumb.dataset.src;
    if (!src || !mainImage) return;

    mainImage.style.opacity = "0";
    setTimeout(() => {
      mainImage.src = src;
      mainImage.style.opacity = "1";
    }, 150);

    thumbs.forEach((t) => t.classList.remove("active"));
    thumb.classList.add("active");
  });
});

// FAQ accordion
document.querySelectorAll(".faq-question").forEach((btn) => {
  btn.addEventListener("click", () => {
    const item = btn.parentElement;
    const wasOpen = item.classList.contains("open");
    document.querySelectorAll(".faq-item").forEach((i) => i.classList.remove("open"));
    if (!wasOpen) item.classList.add("open");
  });
});

// Load product text & price from server (images stay in HTML)
fetch("/api/config")
  .then((r) => r.json())
  .then((data) => {
    const product = data.product;
    if (!product) return;

    const nameEl = document.getElementById("product-name");
    const descEl = document.getElementById("product-desc");
    const priceEl = document.getElementById("product-price");

    if (nameEl && product.name) nameEl.textContent = product.name;
    if (descEl && product.description) descEl.textContent = product.description;
    if (priceEl && product.priceFormatted) priceEl.textContent = product.priceFormatted;
  })
  .catch(() => {});
