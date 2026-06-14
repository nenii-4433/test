let product = null;

const mainImage = document.getElementById("product-image");
const thumbs = document.querySelectorAll(".gallery-thumb");

thumbs.forEach((thumb) => {
  thumb.addEventListener("click", () => {
    const src = thumb.dataset.src;
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

// Load product config from server
fetch("/api/config")
  .then((r) => r.json())
  .then((data) => {
    product = data.product;
    document.getElementById("product-name").textContent = product.name;
    document.getElementById("product-desc").textContent = product.description;
    document.getElementById("product-price").textContent = product.priceFormatted;
    if (product.image) {
      mainImage.src = product.image;
      thumbs[0].querySelector("img").src = product.image;
      thumbs[0].dataset.src = product.image;
    }
  })
  .catch(() => {});
