// ===== Alpha Run — seletor de cor + galeria dinâmica =====
(function () {
  "use strict";

  var COLORS = {
    verde: {
      label: "Preto / Verde",
      hex: "#3fb04a",
      hero: "/images/alpha-run/verde/03.jpg",
      gallery: ["03", "04", "01", "02", "00"]
    },
    azul: {
      label: "Azul / Limão",
      hex: "#3a5aa0",
      hero: "/images/alpha-run/azul/01.jpg",
      gallery: ["01", "02", "04", "03", "00"]
    },
    pink: {
      label: "Preto / Pink",
      hex: "#e6318f",
      hero: "/images/alpha-run/pink/01.jpg",
      gallery: ["01", "02", "03", "00"]
    },
    preto: {
      label: "Preto Total",
      hex: "#1a1a1a",
      hero: "/images/alpha-run/preto/01.jpg",
      gallery: ["01", "03", "02", "00"]
    }
  };

  var ORDER = ["verde", "azul", "pink", "preto"];

  var heroImg = document.getElementById("ar-hero-img");
  var heroTag = document.getElementById("ar-hero-tag-color");
  var swatchRow = document.getElementById("ar-swatches");
  var lineupGrid = document.getElementById("ar-lineup-grid");
  var galleryGrid = document.getElementById("ar-gallery-grid");
  var galleryColorLabel = document.getElementById("ar-gallery-color-label");

  if (!heroImg || !swatchRow) return;

  function imgPath(color, idx) {
    return "/images/alpha-run/" + color + "/" + idx + ".jpg";
  }

  function render(color) {
    var data = COLORS[color];
    if (!data) return;

    heroImg.src = data.hero;
    heroImg.alt = "Tênis Alpha Run, cor " + data.label;
    if (heroTag) heroTag.textContent = data.label;

    Array.prototype.forEach.call(swatchRow.children, function (btn) {
      btn.classList.toggle("is-active", btn.dataset.color === color);
    });
    if (lineupGrid) {
      Array.prototype.forEach.call(lineupGrid.children, function (btn) {
        btn.classList.toggle("is-active", btn.dataset.color === color);
      });
    }

    if (galleryGrid) {
      galleryGrid.innerHTML = "";
      data.gallery.forEach(function (idx) {
        var full = imgPath(color, idx);
        var btn = document.createElement("button");
        btn.className = "gallery-item ar-gallery-item";
        btn.setAttribute("data-full", full);
        btn.innerHTML =
          '<img loading="lazy" src="' +
          full +
          '" alt="Tênis Alpha Run, cor ' +
          data.label +
          ' — detalhe">';
        btn.addEventListener("click", function () {
          var lightbox = document.getElementById("lightbox");
          var lightboxImg = document.getElementById("lightbox-img");
          if (!lightbox || !lightboxImg) return;
          lightboxImg.src = full;
          lightboxImg.alt = btn.querySelector("img").alt;
          lightbox.hidden = false;
          document.body.style.overflow = "hidden";
        });
        galleryGrid.appendChild(btn);
      });
    }
    if (galleryColorLabel) galleryColorLabel.textContent = data.label;
  }

  function buildSwatches() {
    ORDER.forEach(function (color) {
      var data = COLORS[color];
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ar-swatch";
      btn.dataset.color = color;
      btn.innerHTML =
        '<span class="dot" style="background:' +
        data.hex +
        '"></span><span>' +
        data.label +
        "</span>";
      btn.addEventListener("click", function () {
        render(color);
      });
      swatchRow.appendChild(btn);
    });
  }

  function buildLineup() {
    if (!lineupGrid) return;
    ORDER.forEach(function (color) {
      var data = COLORS[color];
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ar-lineup-card";
      btn.dataset.color = color;
      btn.innerHTML =
        '<span class="ar-lineup-thumb"><img loading="lazy" src="' +
        imgPath(color, data.gallery[0]) +
        '" alt="Alpha Run ' +
        data.label +
        '"></span>' +
        '<span class="ar-lineup-card-label"><span class="dot" style="background:' +
        data.hex +
        '"></span><span>' +
        data.label +
        "</span></span>";
      btn.addEventListener("click", function () {
        render(color);
        var hero = document.getElementById("ar-hero-media");
        if (hero) hero.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      lineupGrid.appendChild(btn);
    });
  }

  buildSwatches();
  buildLineup();
  render("verde");

  /* ---------- CTAs de compra: ativa quando o painel admin publicar os
     links reais da Alpha Run. Até lá, o botão leva para a captura de
     e-mail ("avise-me"), nunca para um link inventado. ---------- */
  fetch("/api/admin/content")
    .then(function (r) {
      return r.json();
    })
    .then(function (data) {
      var content = (data && data.content) || {};

      function activate(attr, url, label) {
        if (!url) return;
        document.querySelectorAll('[data-link="' + attr + '"]').forEach(function (a) {
          a.href = url;
          a.target = "_blank";
          a.rel = "noopener";
          var labelEl = a.querySelector(".ar-cta-label");
          if (labelEl) labelEl.textContent = label;
        });
      }

      activate("alpha-shopee", content.alpha_run_shopee_url, "Comprar na Shopee ↗");
      activate(
        "alpha-mercadolivre",
        content.alpha_run_mercadolivre_url,
        "Ver no Mercado Livre ↗"
      );
    })
    .catch(function () {
      /* mantém os CTAs apontando para a captura de e-mail */
    });
})();
