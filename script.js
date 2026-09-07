/* =====================================================================
   SPECTRA GALLERY — SCRIPT.JS
   Responsible for:
     1. A single source-of-truth data array describing every image
     2. Category filtering of the grid
     3. Lightbox open/close, prev/next navigation
     4. Keyboard support (Esc, ArrowLeft, ArrowRight)
     5. Small entrance-animation polish via IntersectionObserver
   ===================================================================== */

(function () {
  "use strict";

  /* -------------------------------------------------------------------
     1. IMAGE DATA
     Single source of truth. If you add/remove images, update this
     array AND the matching <figure> markup in index.html (or switch
     to fully JS-rendered markup — see renderGrid() below, which is
     already wired up and will happily take over rendering for you).
  ------------------------------------------------------------------- */
  const imageData = [
    { id: 0,  category: "ai",       tag: "AI",       title: "Neural Network Visualization", src: "images/ai1.jpg" },
    { id: 1,  category: "ai",       tag: "AI",       title: "Machine Learning Model",        src: "images/ai2.jpg" },
    { id: 2,  category: "ai",       tag: "AI",       title: "Generative AI Artwork",          src: "images/ai3.jpg" },
    { id: 3,  category: "coding",   tag: "Coding",   title: "Source Code Close-up",           src: "images/code1.jpg" },
    { id: 4,  category: "coding",   tag: "Coding",   title: "Developer Workspace",             src: "images/code2.jpg" },
    { id: 5,  category: "coding",   tag: "Coding",   title: "Terminal & Build Scripts",        src: "images/code3.jpg" },
    { id: 6,  category: "robotics", tag: "Robotics", title: "Robotic Arm Assembly",            src: "images/robot1.jpg" },
    { id: 7,  category: "robotics", tag: "Robotics", title: "Humanoid Prototype",              src: "images/robot2.jpg" },
    { id: 8,  category: "robotics", tag: "Robotics", title: "Autonomous Drone",                src: "images/robot3.jpg" },
    { id: 9,  category: "cloud",    tag: "Cloud",    title: "Data Center Racks",                src: "images/cloud1.jpg" },
    { id: 10, category: "cloud",    tag: "Cloud",    title: "Network Architecture",             src: "images/cloud2.jpg" },
    { id: 11, category: "cloud",    tag: "Cloud",    title: "Storage & Sync",                   src: "images/cloud3.jpg" },
  ];

  /* -------------------------------------------------------------------
     2. DOM REFERENCES
  ------------------------------------------------------------------- */
  const galleryGrid   = document.getElementById("galleryGrid");
  const emptyState     = document.getElementById("emptyState");
  const filterTrack    = document.getElementById("filterTrack");

  const lightbox        = document.getElementById("lightbox");
  const lightboxBackdrop = document.getElementById("lightboxBackdrop");
  const lightboxImage    = document.getElementById("lightboxImage");
  const lightboxCaption  = document.getElementById("lightboxCaption");
  const lightboxTag      = document.getElementById("lightboxTag");
  const lightboxCounter  = document.getElementById("lightboxCounter");
  const lightboxClose    = document.getElementById("lightboxClose");
  const lightboxPrev     = document.getElementById("lightboxPrev");
  const lightboxNext     = document.getElementById("lightboxNext");

  /* Tracks which subset of imageData is currently visible in the grid,
     so prev/next inside the lightbox respects the active filter. */
  let activeFilter = "all";
  let visibleItems = [...imageData];
  let currentIndex = 0; // index within visibleItems, not imageData

  /* -------------------------------------------------------------------
     3. GRID RENDERING
     The HTML already ships with static <figure> markup for graceful
     no-JS degradation. Here we re-render from imageData so filtering /
     indexing always stays perfectly in sync with the data model.
  ------------------------------------------------------------------- */
  function renderGrid(items) {
    galleryGrid.innerHTML = "";

    if (items.length === 0) {
      emptyState.hidden = false;
      return;
    }
    emptyState.hidden = true;

    items.forEach((item, i) => {
      const figure = document.createElement("figure");
      figure.className = "gallery-item";
      figure.dataset.category = item.category;
      figure.dataset.visibleIndex = i;
      // Slight stagger on the rise-in animation for a polished cascade
      figure.style.animationDelay = `${Math.min(i * 40, 400)}ms`;

      figure.innerHTML = `
        <img src="${item.src}" alt="${item.title}" loading="lazy" />
        <figcaption class="item-overlay">
          <span class="item-tag">${item.tag}</span>
          <span class="item-title">${item.title}</span>
        </figcaption>
      `;

      figure.addEventListener("click", () => openLightbox(i));
      galleryGrid.appendChild(figure);
    });
  }

  /* -------------------------------------------------------------------
     4. FILTERING
  ------------------------------------------------------------------- */
  function applyFilter(category) {
    activeFilter = category;
    visibleItems = category === "all"
      ? [...imageData]
      : imageData.filter((item) => item.category === category);

    renderGrid(visibleItems);

    // Sync active state on filter buttons
    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.filter === category);
    });
  }

  filterTrack.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-btn");
    if (!btn) return;
    applyFilter(btn.dataset.filter);
  });

  /* -------------------------------------------------------------------
     5. LIGHTBOX
  ------------------------------------------------------------------- */
  function openLightbox(index) {
    currentIndex = index;
    updateLightboxContent();
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden"; // lock background scroll
    lightboxClose.focus();
  }

  function closeLightbox() {
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function updateLightboxContent() {
    const item = visibleItems[currentIndex];
    if (!item) return;

    lightboxImage.src = item.src;
    lightboxImage.alt = item.title;
    lightboxCaption.textContent = item.title;
    lightboxTag.textContent = item.tag;

    const total = visibleItems.length;
    const position = String(currentIndex + 1).padStart(2, "0");
    const totalStr = String(total).padStart(2, "0");
    lightboxCounter.textContent = `${position} / ${totalStr}`;
  }

  function showNext() {
    currentIndex = (currentIndex + 1) % visibleItems.length;
    updateLightboxContent();
  }

  function showPrev() {
    currentIndex = (currentIndex - 1 + visibleItems.length) % visibleItems.length;
    updateLightboxContent();
  }

  lightboxClose.addEventListener("click", closeLightbox);
  lightboxBackdrop.addEventListener("click", closeLightbox);
  lightboxNext.addEventListener("click", showNext);
  lightboxPrev.addEventListener("click", showPrev);

  /* Keyboard support: Esc closes, arrows navigate — only while the
     lightbox is actually open, so we don't hijack page-level keys. */
  document.addEventListener("keydown", (e) => {
    if (!lightbox.classList.contains("is-open")) return;

    switch (e.key) {
      case "Escape":
        closeLightbox();
        break;
      case "ArrowRight":
        showNext();
        break;
      case "ArrowLeft":
        showPrev();
        break;
    }
  });

  /* Basic swipe support for touch devices (mobile-friendly navigation) */
  let touchStartX = 0;
  lightbox.addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  lightbox.addEventListener("touchend", (e) => {
    const touchEndX = e.changedTouches[0].screenX;
    const delta = touchEndX - touchStartX;
    const SWIPE_THRESHOLD = 40;

    if (delta > SWIPE_THRESHOLD) showPrev();
    else if (delta < -SWIPE_THRESHOLD) showNext();
  }, { passive: true });

  /* -------------------------------------------------------------------
     6. INIT
  ------------------------------------------------------------------- */
  function init() {
    renderGrid(imageData);
    applyFilter("all");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
