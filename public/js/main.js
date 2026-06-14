let product = null;

const mainImage = document.getElementById("product-image");
const thumbsContainer = document.querySelector(".product-gallery-thumbs");

const labels = ["White front", "Black front", "White back", "Black back"];

function setActiveThumb(thumb) {
  document.querySelectorAll(".gallery-thumb").forEach((t) => t.classList.remove("active"));
  thumb.classList.add("active");
}

function switchImage(src) {
  mainImage.style.opacity = "0";
  setTimeout(() => {
    mainImage.src = src;
    mainImage.style.opacity = "1";
  }, 150);
}

function buildGallery(images) {
  if (!thumbsContainer || !images?.length) return;

  thumbsContainer.innerHTML = images
    .map(
      (src, i) => `
    <button class="gallery-thumb${i === 0 ? " active" : ""}" data-src="${src}" aria-label="${labels[i] || "View " + (i + 1)}">
      <img src="${src}" alt="${labels[i] || "Product view " + (i + 1)}">
    </button>`
    )
    .join("");

  thumbsContainer.querySelectorAll(".gallery-thumb").forEach((thumb) => {
    thumb.addEventListener("click", () => {
      switchImage(thumb.dataset.src);
      setActiveThumb(thumb);
    });
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

fetch("/api/config")
  .then((r) => r.json())
  .then((data) => {
    product = data.product;
    document.getElementById("product-name").textContent = product.name;
    document.getElementById("product-desc").textContent = product.description;
    document.getElementById("product-price").textContent = product.priceFormatted;

    const images = product.images?.length ? product.images : product.image ? [product.image] : [];
    if (images.length) {
      mainImage.src = images[0];
      buildGallery(images);
    }
  })
  .catch(() => {});
