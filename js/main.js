// ===== Adventure Trail — interactions =====
(function () {
  "use strict";

  /* ---------- size table ---------- */
  var SIZES = [
    { br: 34, cm: 22.7 },
    { br: 35, cm: 23.3 },
    { br: 36, cm: 24.0 },
    { br: 37, cm: 24.7 },
    { br: 38, cm: 25.3 },
    { br: 39, cm: 26.0 },
    { br: 40, cm: 26.7 },
    { br: 41, cm: 27.3 },
    { br: 42, cm: 28.0 },
    { br: 43, cm: 28.6 },
    { br: 44, cm: 29.3 }
  ];

  var sizeGrid = document.getElementById("size-grid");
  var sizeResult = document.getElementById("size-result");
  var footInput = document.getElementById("foot-length");

  function fmtCm(v) {
    return String(v).replace(".", ",") + " cm";
  }

  function buildGrid() {
    if (!sizeGrid) return;
    SIZES.forEach(function (s) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.br = s.br;
      btn.dataset.cm = s.cm;
      btn.innerHTML =
        "<strong>" + s.br + " BR</strong><span>" + fmtCm(s.cm) + "</span>";
      btn.addEventListener("click", function () {
        selectSize(s, true);
        footInput.value = String(s.cm).replace(".", ",");
      });
      sizeGrid.appendChild(btn);
    });
  }

  function clearSelection() {
    Array.prototype.forEach.call(
      sizeGrid.querySelectorAll("button"),
      function (b) {
        b.classList.remove("is-selected");
      }
    );
  }

  function selectSize(size, exact) {
    clearSelection();
    var btn = sizeGrid.querySelector('button[data-br="' + size.br + '"]');
    if (btn) btn.classList.add("is-selected");

    sizeResult.classList.remove("has-match");
    // force reflow to restart the pop-in animation
    void sizeResult.offsetWidth;

    sizeResult.innerHTML =
      '<span class="match-size">' +
      size.br +
      '</span><span class="match-detail"><strong>Numeração BR ' +
      size.br +
      "</strong><span>" +
      (exact
        ? "Corresponde a " + fmtCm(size.cm) + " de comprimento do pé."
        : "Sugestão mais próxima da medida informada (" +
          fmtCm(size.cm) +
          ").") +
      "</span></span>";

    sizeResult.classList.add("has-match");
  }

  function handleFootInput(raw) {
    var normalized = raw.replace(",", ".").trim();
    var value = parseFloat(normalized);

    if (!raw || isNaN(value)) {
      clearSelection();
      sizeResult.classList.remove("has-match");
      sizeResult.innerHTML = "<p>Digite a medida para consultar a tabela.</p>";
      return;
    }

    // find the closest size by cm
    var closest = SIZES[0];
    var smallestDiff = Math.abs(SIZES[0].cm - value);
    SIZES.forEach(function (s) {
      var diff = Math.abs(s.cm - value);
      if (diff < smallestDiff) {
        smallestDiff = diff;
        closest = s;
      }
    });

    var exact = SIZES.some(function (s) {
      return Math.abs(s.cm - value) < 0.05;
    });

    selectSize(closest, exact);
  }

  if (footInput) {
    buildGrid();
    footInput.addEventListener("input", function (e) {
      handleFootInput(e.target.value);
    });
  }

  /* ---------- trilha / caminhada toggle ---------- */
  var toggleBtns = document.querySelectorAll(".toggle-btn");
  toggleBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      toggleBtns.forEach(function (b) {
        b.classList.remove("is-active");
      });
      btn.classList.add("is-active");
    });
  });

  /* ---------- gallery lightbox ---------- */
  var lightbox = document.getElementById("lightbox");
  var lightboxImg = document.getElementById("lightbox-img");
  var lightboxClose = document.getElementById("lightbox-close");

  document.querySelectorAll(".gallery-item").forEach(function (item) {
    item.addEventListener("click", function () {
      var full = item.getAttribute("data-full");
      lightboxImg.src = full;
      lightboxImg.alt = item.querySelector("img").alt;
      lightbox.hidden = false;
      document.body.style.overflow = "hidden";
    });
  });

  function closeLightbox() {
    lightbox.hidden = true;
    lightboxImg.src = "";
    document.body.style.overflow = "";
  }

  if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
  if (lightbox) {
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) closeLightbox();
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeLightbox();
  });

  /* ---------- mobile nav ---------- */
  var navToggle = document.querySelector(".nav-toggle");
  var mainNav = document.querySelector(".main-nav");
  if (navToggle && mainNav) {
    navToggle.addEventListener("click", function () {
      var isOpen = mainNav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });
    mainNav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        mainNav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------- header shadow on scroll ---------- */
  var header = document.querySelector(".site-header");
  if (header) {
    window.addEventListener("scroll", function () {
      if (window.scrollY > 20) header.classList.add("is-scrolled");
      else header.classList.remove("is-scrolled");
    });
  }
})();
