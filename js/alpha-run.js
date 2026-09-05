// ===== Alpha Run — seletor de cor + galeria dinâmica =====
(function () {
  "use strict";

  var PRODUCT = "alpha-run";

  var COLORS = {
    verde: {
      label: "Preto / Verde",
      hex: "#3fb04a",
      gallery: ["03", "04", "01", "02", "00"]
    },
    azul: {
      label: "Azul / Limão",
      hex: "#3a5aa0",
      gallery: ["01", "02", "04", "03", "00"]
    },
    pink: {
      label: "Preto / Pink",
      hex: "#e6318f",
      gallery: ["01", "02", "03", "00"]
    },
    preto: {
      label: "Preto Total",
      hex: "#1a1a1a",
      gallery: ["01", "03", "02", "00"]
    }
  };

  var ORDER = ["verde", "azul", "pink", "preto"];

  // Every color starts from the static, checked-in photos. If the admin
  // panel has uploaded photos for a color, applyDynamicImages() below
  // overwrites just that color's heroUrl/galleryUrls with API-served ones —
  // any color the admin hasn't touched yet just keeps working as before.
  ORDER.forEach(function (color) {
    var data = COLORS[color];
    data.galleryUrls = data.gallery.map(function (idx) {
      return "/images/alpha-run/" + color + "/" + idx + ".jpg";
    });
    data.heroUrl = data.galleryUrls[0];
  });
  // hero photo picks per the original curation (kept distinct from gallery[0]
  // for verde/azul/pink/preto)
  COLORS.verde.heroUrl = "/images/alpha-run/verde/03.jpg";
  COLORS.azul.heroUrl = "/images/alpha-run/azul/01.jpg";
  COLORS.pink.heroUrl = "/images/alpha-run/pink/01.jpg";
  COLORS.preto.heroUrl = "/images/alpha-run/preto/01.jpg";

  var currentColor = "verde";

  var heroImg = document.getElementById("ar-hero-img");
  var heroTag = document.getElementById("ar-hero-tag-color");
  var swatchRow = document.getElementById("ar-swatches");
  var lineupGrid = document.getElementById("ar-lineup-grid");
  var galleryGrid = document.getElementById("ar-gallery-grid");
  var galleryColorLabel = document.getElementById("ar-gallery-color-label");
  var unavailableBanner = document.getElementById("ar-unavailable-banner");

  var priceBox = document.getElementById("ar-price");
  var priceCurrentEl = document.getElementById("ar-price-current");
  var priceOriginalEl = document.getElementById("ar-price-original");
  var pricePromoEl = document.getElementById("ar-price-promo");

  if (!heroImg || !swatchRow) return;

  function render(color) {
    var data = COLORS[color];
    if (!data) return;
    currentColor = color;

    heroImg.src = data.heroUrl;
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
      data.galleryUrls.forEach(function (full) {
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
    lineupGrid.innerHTML = "";
    ORDER.forEach(function (color) {
      var data = COLORS[color];
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ar-lineup-card";
      btn.dataset.color = color;
      btn.innerHTML =
        '<span class="ar-lineup-thumb"><img loading="lazy" src="' +
        data.galleryUrls[0] +
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

  /* ---------- fotos enviadas pelo painel administrativo ----------
     Cada cor começa com as fotos estáticas curadas no lançamento. Se o
     admin tiver enviado fotos novas para uma cor pelo painel, elas
     substituem só a capa e a galeria daquela cor — as demais continuam
     com as fotos padrão até serem atualizadas também. */
  fetch("/api/product-images?product=" + PRODUCT)
    .then(function (r) {
      return r.json();
    })
    .then(function (data) {
      var colorsMeta = (data && data.colors) || {};
      var touchedCurrent = false;

      Object.keys(colorsMeta).forEach(function (color) {
        var data2 = COLORS[color];
        var images = colorsMeta[color];
        if (!data2 || !images || !images.length) return;

        var urls = images.map(function (img) {
          return "/api/product-image?id=" + img.id;
        });
        var heroIdx = -1;
        images.forEach(function (img, i) {
          if (img.isHero) heroIdx = i;
        });
        if (heroIdx === -1) heroIdx = 0;

        data2.galleryUrls = urls;
        data2.heroUrl = urls[heroIdx];

        if (color === currentColor) touchedCurrent = true;
      });

      buildLineup();
      render(currentColor);
    })
    .catch(function () {
      /* mantém as fotos estáticas padrão */
    });

  /* ---------- CTAs de compra, preço e disponibilidade: controlados pelo
     painel admin. Até serem configurados, os botões levam para a captura
     de e-mail ("avise-me"), nunca para um link inventado. ---------- */
  fetch("/api/admin/content")
    .then(function (r) {
      return r.json();
    })
    .then(function (data) {
      var content = (data && data.content) || {};
      var isActive = content.alpha_run_active !== "false";

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

      // Preço e promoção
      var current = parseFloat(String(content.alpha_run_price_current || "").replace(",", "."));
      if (priceBox && !isNaN(current) && current > 0) {
        function fmtBRL(v) {
          return "R$ " + v.toFixed(2).replace(".", ",");
        }
        priceCurrentEl.textContent = fmtBRL(current);
        var original = parseFloat(String(content.alpha_run_price_original || "").replace(",", "."));
        if (!isNaN(original) && original > current) {
          priceOriginalEl.textContent = fmtBRL(original);
          priceOriginalEl.hidden = false;
        }
        if (content.alpha_run_promo_enabled === "true" && content.alpha_run_promo_label) {
          pricePromoEl.textContent = content.alpha_run_promo_label;
          pricePromoEl.hidden = false;
        }
        priceBox.hidden = false;
      }

      // Produto retirado temporariamente: mostra aviso e nunca ativa links
      // reais de compra, mesmo que já estejam configurados no painel.
      if (!isActive) {
        if (unavailableBanner) unavailableBanner.hidden = false;
        return;
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
