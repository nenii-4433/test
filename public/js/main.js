const mainImage = document.getElementById("product-image");
const captionEl = document.getElementById("gallery-caption");
const titleEl = document.getElementById("product-name");
const descEl = document.getElementById("product-desc");
const priceEl = document.getElementById("product-price");
const compareEl = document.getElementById("product-price-compare");
const discountEl = document.getElementById("price-discount");
const buyBtn = document.getElementById("buy-btn");
const heroTag = document.getElementById("hero-tag");
const productBadge = document.getElementById("product-badge");
const variantLabel = document.getElementById("variant-label");
const shirtsThumbs = document.getElementById("shirts-gallery-thumbs");
const trousersThumbs = document.getElementById("trousers-gallery-thumbs");
const gymwearThumbs = document.getElementById("gymwear-gallery-thumbs");
const categoryPanels = document.querySelectorAll("[data-category-panel]");
const sizeContainer = document.getElementById("size-options");
const categoryTabs = document.querySelectorAll(".category-tab");

let currentCategory = sessionStorage.getItem("selectedCategory") || "shirts";
let catalog = null;

function formatPrice(amount) {
  return new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR" }).format(amount);
}

function getActiveThumbs() {
  if (currentCategory === "trousers") {
    return trousersThumbs.querySelectorAll(".gallery-thumb");
  }
  if (currentCategory === "gymwear") {
    return gymwearThumbs.querySelectorAll(".gallery-thumb");
  }
  return shirtsThumbs.querySelectorAll(".gallery-thumb");
}

function getActiveThumbSelector() {
  if (currentCategory === "trousers") return "#trousers-gallery-thumbs .gallery-thumb.active";
  if (currentCategory === "gymwear") return "#gymwear-gallery-thumbs .gallery-thumb.active";
  return "#shirts-gallery-thumbs .gallery-thumb.active";
}

function updatePriceDisplay(price, compareAt) {
  if (priceEl) priceEl.textContent = formatPrice(price);
  const saved = (compareAt || 0) - (price || 0);
  if (compareEl) {
    compareEl.textContent = formatPrice(compareAt);
    compareEl.style.display = saved > 0 ? "" : "none";
  }
  if (discountEl) {
    discountEl.textContent = saved > 0 ? `Save ${formatPrice(saved)}` : "";
    discountEl.style.display = saved > 0 ? "" : "none";
  }
}

function getTrouserColor(name) {
  if (name.includes("Army color")) return "Army color";
  if (name.includes("Dark gray")) return "Dark gray";
  if (name.includes("Black")) return "Black";
  return "Dark gray";
}

function updateVariantLabel(size, productName) {
  if (!variantLabel) return;
  if (currentCategory !== "trousers" || !size) {
    variantLabel.hidden = true;
    return;
  }
  const color = getTrouserColor(productName);
  variantLabel.textContent = `${size} [composite thickened]-${color}`;
  variantLabel.hidden = false;
}

function saveSelection(name, src, desc, price, compareAt) {
  sessionStorage.setItem("selectedShirt", name);
  sessionStorage.setItem("selectedImage", src);
  sessionStorage.setItem("selectedCategory", currentCategory);
  if (desc) sessionStorage.setItem("selectedDesc", desc);
  if (price) sessionStorage.setItem("selectedPrice", price);
  if (compareAt) sessionStorage.setItem("selectedCompareAt", compareAt);
}

function saveSize(size) {
  if (size) sessionStorage.setItem("selectedSize", size);
}

function renderSizeOptions(sizes, selectedSize) {
  if (!sizeContainer) return;
  sizeContainer.innerHTML = sizes
    .map(
      (s) =>
        `<button type="button" class="size-option${s === selectedSize ? " active" : ""}" data-size="${s}">${s}</button>`
    )
    .join("");

  sizeContainer.querySelectorAll(".size-option").forEach((btn) => {
    btn.addEventListener("click", () => selectSize(btn));
  });
}

function getSizesForThumb(thumb) {
  if (thumb.dataset.sizes) return thumb.dataset.sizes.split(",");
  if (currentCategory === "gymwear" && catalog?.gymWear) {
    return catalog.gymWear.sizes || ["S", "M", "L", "XL"];
  }
  if (currentCategory === "trousers" && catalog?.trousers) {
    const variant = catalog.trousers.variants.find((v) => thumb.dataset.name.includes(v.color));
    return variant ? variant.sizes : ["M", "L", "XL", "2XL"];
  }
  return catalog?.sizes || ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];
}

function selectSize(btn) {
  const size = btn.dataset.size;
  if (!size) return;
  sizeContainer.querySelectorAll(".size-option").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  saveSize(size);
  const active = document.querySelector(getActiveThumbSelector());
  if (active) updateVariantLabel(size, active.dataset.name);
}

function updateCategoryChrome() {
  if (heroTag) {
    if (currentCategory === "gymwear") {
      heroTag.textContent = "Exclusive";
      heroTag.style.display = "";
    } else if (currentCategory === "trousers") {
      heroTag.style.display = "none";
    } else {
      heroTag.textContent = "Sale";
      heroTag.style.display = "";
    }
  }
  if (productBadge) {
    if (currentCategory === "gymwear") productBadge.textContent = "Exclusive";
    else if (currentCategory === "trousers") productBadge.textContent = "Trousers";
    else productBadge.textContent = "RawTee";
  }
}

function selectProduct(thumb) {
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

  getActiveThumbs().forEach((t) => t.classList.remove("active"));
  thumb.classList.add("active");

  const sizes = getSizesForThumb(thumb);
  const savedSize = sessionStorage.getItem("selectedSize");
  const validSize = sizes.includes(savedSize) ? savedSize : null;
  renderSizeOptions(sizes, validSize);
  updateVariantLabel(validSize, name);
  updateCategoryChrome();
}

function categoryMatchesThumb(category, thumb) {
  if (!thumb?.dataset.name) return false;
  if (category === "trousers") return thumb.dataset.name.includes("Trousers");
  if (category === "gymwear") return thumb.dataset.name.toLowerCase().includes("gym wear");
  return !thumb.dataset.name.includes("Trousers") && !thumb.dataset.name.toLowerCase().includes("gym wear");
}

function syncSpotlightToCategory(category) {
  document.querySelectorAll("[data-spotlight-category]").forEach((section) => {
    section.classList.toggle("is-active", section.dataset.spotlightCategory === category);
  });
}

function saveSpotlightProduct(btn) {
  const { name, src, desc, price, compare } = btn.dataset;
  const category = btn.closest("[data-spotlight-category]")?.dataset.spotlightCategory || currentCategory;
  sessionStorage.setItem("selectedShirt", name);
  sessionStorage.setItem("selectedImage", src);
  sessionStorage.setItem("selectedCategory", category);
  if (desc) sessionStorage.setItem("selectedDesc", desc);
  if (price) sessionStorage.setItem("selectedPrice", price);
  if (compare) sessionStorage.setItem("selectedCompareAt", compare);
  sessionStorage.removeItem("selectedSize");
}

function switchCategory(category, { scroll = false, productSrc = null } = {}) {
  currentCategory = category;
  sessionStorage.setItem("selectedCategory", category);

  categoryTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.category === category);
  });

  shirtsThumbs.hidden = category !== "shirts";
  trousersThumbs.hidden = category !== "trousers";
  gymwearThumbs.hidden = category !== "gymwear";

  categoryPanels.forEach((panel) => {
    panel.hidden = panel.dataset.categoryPanel !== category;
  });

  const thumbs = getActiveThumbs();
  const savedImage = sessionStorage.getItem("selectedImage");
  let match = productSrc ? [...thumbs].find((t) => t.dataset.src === productSrc) : null;
  if (!match && savedImage) {
    match = [...thumbs].find((t) => t.dataset.src === savedImage);
  }
  if (!match || !categoryMatchesThumb(category, match)) {
    match = thumbs[0];
  }
  if (match) selectProduct(match);

  syncSpotlightToCategory(category);

  if (scroll) {
    document
      .querySelector(`[data-spotlight-category="${category}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function openCollectionProduct(card) {
  const category = card.dataset.collectionCategory;
  if (!category) return;

  switchCategory(category, { productSrc: card.dataset.src });

  const thumbs = getActiveThumbs();
  const match =
    [...thumbs].find((t) => t.dataset.src === card.dataset.src) ||
    [...thumbs].find((t) => t.dataset.name === card.dataset.name);

  if (match) selectProduct(match);

  document.querySelector(".hero")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

categoryTabs.forEach((tab) => {
  tab.addEventListener("click", () => switchCategory(tab.dataset.category, { scroll: true }));
});

document.querySelectorAll("[data-spotlight-shop]").forEach((btn) => {
  btn.addEventListener("click", () => saveSpotlightProduct(btn));
});

document.querySelectorAll(".collection-product-card").forEach((card) => {
  card.addEventListener("click", () => openCollectionProduct(card));
});

shirtsThumbs.querySelectorAll(".gallery-thumb").forEach((thumb) => {
  thumb.addEventListener("click", () => {
    if (currentCategory !== "shirts") switchCategory("shirts");
    selectProduct(thumb);
  });
});

trousersThumbs.querySelectorAll(".gallery-thumb").forEach((thumb) => {
  thumb.addEventListener("click", () => {
    if (currentCategory !== "trousers") switchCategory("trousers");
    selectProduct(thumb);
  });
});

gymwearThumbs.querySelectorAll(".gallery-thumb").forEach((thumb) => {
  thumb.addEventListener("click", () => {
    if (currentCategory !== "gymwear") switchCategory("gymwear");
    selectProduct(thumb);
  });
});

if (buyBtn) {
  buyBtn.addEventListener("click", (e) => {
    const activeSize = sizeContainer.querySelector(".size-option.active");
    if (!activeSize) {
      e.preventDefault();
      alert("Please select a size before adding to cart.");
      return;
    }

    const active = document.querySelector(getActiveThumbSelector());
    if (active) {
      saveSelection(
        active.dataset.name,
        active.dataset.src,
        active.dataset.desc,
        active.dataset.price,
        active.dataset.compare
      );
    }
    saveSize(activeSize.dataset.size);
  });
}

document.querySelectorAll(".faq-question").forEach((btn) => {
  btn.addEventListener("click", () => {
    const item = btn.parentElement;
    const wasOpen = item.classList.contains("open");
    document.querySelectorAll(".faq-item").forEach((i) => i.classList.remove("open"));
    if (!wasOpen) item.classList.add("open");
  });
});

fetchStoreConfig()
  .then((data) => {
    catalog = data.product;
    if (!catalog) return;

    if (catalog.images?.length) {
      catalog.images.forEach((item) => {
        const thumb = [...shirtsThumbs.querySelectorAll(".gallery-thumb")].find(
          (t) => t.dataset.src === item.src
        );
        if (!thumb) return;
        if (item.description) thumb.dataset.desc = item.description;
        if (item.price) thumb.dataset.price = item.price;
        if (item.compareAt) thumb.dataset.compare = item.compareAt;
      });
    }

    if (catalog.trousers?.variants?.length) {
      catalog.trousers.variants.forEach((item) => {
        [...trousersThumbs.querySelectorAll(".gallery-thumb")]
          .filter((t) => t.dataset.name.includes(item.color))
          .forEach((thumb) => {
            thumb.dataset.desc = item.description;
            thumb.dataset.price = item.price;
            thumb.dataset.compare = item.compareAt;
            thumb.dataset.sizes = item.sizes.join(",");
          });
      });
    }

    if (catalog.gymWear?.variants?.length) {
      catalog.gymWear.variants.forEach((item) => {
        const thumb = [...gymwearThumbs.querySelectorAll(".gallery-thumb")].find((t) =>
          t.dataset.name.includes(item.style)
        );
        if (!thumb) return;
        thumb.dataset.desc = item.description;
        thumb.dataset.price = item.price;
        thumb.dataset.compare = item.compareAt;
        thumb.dataset.sizes = item.sizes.join(",");
      });
    }

    switchCategory(currentCategory);
  })
  .catch(() => {
    renderSizeOptions(["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"]);
    syncSpotlightToCategory(currentCategory);
  });
