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

  /* ---------- click tracking (CTA buttons) ---------- */
  // Fire-and-forget: never blocks or delays the actual link click.
  document.querySelectorAll("[data-track-label]").forEach(function (link) {
    link.addEventListener("click", function () {
      try {
        fetch("/api/track-click", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: link.getAttribute("data-track-label"),
            targetUrl: link.href,
            page: window.location.pathname
          }),
          keepalive: true
        }).catch(function () {});
      } catch (e) {
        /* tracking must never break the click-through */
      }
    });
  });

  /* ---------- lead capture form ---------- */
  var leadForm = document.getElementById("lead-form");
  if (leadForm) {
    var leadSuccess = document.getElementById("lead-success");
    var leadError = document.getElementById("lead-error");
    var leadSubmit = document.getElementById("lead-submit");

    leadForm.addEventListener("submit", function (e) {
      e.preventDefault();
      leadSuccess.hidden = true;
      leadError.hidden = true;

      var email = document.getElementById("lead-email").value.trim();
      if (!email || email.indexOf("@") === -1) {
        leadError.textContent = "Informe um e-mail válido.";
        leadError.hidden = false;
        return;
      }

      leadSubmit.disabled = true;
      var originalLabel = leadSubmit.textContent;
      leadSubmit.textContent = "Enviando…";

      fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: document.getElementById("lead-name").value.trim(),
          email: email,
          website: document.getElementById("lead-website").value
        })
      })
        .then(function (r) {
          return r.json().then(function (data) {
            return { status: r.status, data: data };
          });
        })
        .then(function (res) {
          leadSubmit.disabled = false;
          leadSubmit.textContent = originalLabel;
          if (res.status === 200 && res.data.ok) {
            leadForm.reset();
            leadSuccess.hidden = false;
          } else {
            leadError.textContent =
              res.data.message || "Não foi possível enviar. Tente novamente.";
            leadError.hidden = false;
          }
        })
        .catch(function () {
          leadSubmit.disabled = false;
          leadSubmit.textContent = originalLabel;
          leadError.textContent = "Erro de conexão. Tente novamente.";
          leadError.hidden = false;
        });
    });
  }

  /* ---------- content overrides (edited from /admin) ---------- */
  // Fails silently and keeps the static defaults above if the API is
  // unreachable or not configured yet — this is a progressive enhancement,
  // never a requirement for the page to render correctly.
  fetch("/api/admin/content")
    .then(function (r) {
      return r.json();
    })
    .then(function (data) {
      var content = (data && data.content) || {};
      if (!Object.keys(content).length) return;

      function setText(id, key) {
        if (!content[key]) return;
        var el = document.getElementById(id);
        if (el) el.textContent = content[key];
      }

      setText("hero-eyebrow", "hero_eyebrow");
      setText("hero-title-line1", "hero_title_line1");
      setText("hero-title-line2", "hero_title_line2");
      setText("hero-subtitle", "hero_subtitle");

      if (content.shopee_url) {
        document.querySelectorAll('[data-link="shopee"]').forEach(function (a) {
          a.href = content.shopee_url;
        });
      }
      if (content.mercadolivre_url) {
        document.querySelectorAll('[data-link="mercadolivre"]').forEach(function (a) {
          a.href = content.mercadolivre_url;
        });
      }

      // Alpha Run retirado do ar pelo painel: some da home sem quebrar links.
      if (content.alpha_run_active === "false") {
        ["nav-alpha-run", "alpha-teaser-section", "footer-alpha-run"].forEach(function (id) {
          var el = document.getElementById(id);
          if (el) el.hidden = true;
        });
      }

      if (content.promo_banner_enabled === "true" && content.promo_banner_text) {
        var banner = document.getElementById("promo-banner");
        var bannerText = document.getElementById("promo-banner-text");
        if (banner && bannerText) {
          bannerText.textContent = content.promo_banner_text;
          banner.hidden = false;
        }
      }
    })
    .catch(function () {
      /* keep static content as-is */
    });
})();
