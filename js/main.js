// ===== Alpins — interações do site público =====
(function () {
  "use strict";

  /* ---------- mobile nav ---------- */
  var navToggle = document.querySelector(".nav-toggle");
  var mainNav = document.querySelector(".main-nav");
  function setNav(open) {
    if (!navToggle || !mainNav) return;
    mainNav.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
  }
  if (navToggle && mainNav) {
    navToggle.addEventListener("click", function () {
      setNav(!mainNav.classList.contains("is-open"));
    });
    mainNav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        setNav(false);
      });
    });
  }

  /* ---------- header background on scroll ---------- */
  var header = document.querySelector(".site-header");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 20);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- broken images → placeholder ---------- */
  function markBroken(img) {
    if (img.id === "lightbox-img") return;
    img.hidden = true;
    if (img.parentElement) img.parentElement.classList.add("is-broken");
  }
  document.addEventListener(
    "error",
    function (e) {
      if (e.target && e.target.tagName === "IMG") markBroken(e.target);
    },
    true
  );
  // Images that already failed before this deferred script ran.
  Array.prototype.forEach.call(document.images, function (img) {
    if (img.getAttribute("src") && img.complete && img.naturalWidth === 0) markBroken(img);
  });

  /* ---------- product gallery ---------- */
  var mainImg = document.getElementById("gallery-main");
  var thumbs = document.querySelectorAll("[data-gallery-src]");
  thumbs.forEach(function (thumb) {
    thumb.addEventListener("click", function () {
      if (!mainImg) return;
      mainImg.hidden = false;
      if (mainImg.parentElement) mainImg.parentElement.classList.remove("is-broken");
      mainImg.src = thumb.getAttribute("data-gallery-src");
      thumbs.forEach(function (t) {
        t.classList.remove("is-active");
        t.setAttribute("aria-pressed", "false");
      });
      thumb.classList.add("is-active");
      thumb.setAttribute("aria-pressed", "true");
    });
  });

  /* ---------- lightbox ---------- */
  var lightbox = document.getElementById("lightbox");
  var lightboxImg = document.getElementById("lightbox-img");
  var lightboxClose = document.getElementById("lightbox-close");
  var lastFocus = null;

  document.querySelectorAll("[data-lightbox]").forEach(function (trigger) {
    trigger.addEventListener("click", function () {
      var img = trigger.querySelector("img");
      if (!img || img.hidden || !lightbox) return;
      lastFocus = trigger;
      lightboxImg.src = img.currentSrc || img.src;
      lightboxImg.alt = img.alt;
      lightbox.hidden = false;
      document.body.style.overflow = "hidden";
      lightboxClose.focus();
    });
  });

  function closeLightbox() {
    if (!lightbox || lightbox.hidden) return;
    lightbox.hidden = true;
    lightboxImg.removeAttribute("src");
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }
  if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
  if (lightbox) {
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) closeLightbox();
    });
  }
  document.addEventListener("keydown", function (e) {
    // Com a imagem ampliada aberta, o Tab fica no botão de fechar (única ação disponível).
    if (e.key === "Tab" && lightbox && !lightbox.hidden) {
      e.preventDefault();
      lightboxClose.focus();
      return;
    }
    if (e.key !== "Escape") return;
    closeLightbox();
    if (mainNav && mainNav.classList.contains("is-open")) {
      setNav(false);
      navToggle.focus();
    }
  });

  /* ---------- click tracking (marketplace buttons) ---------- */
  // Fire-and-forget: never blocks or delays the actual link click.
  document.addEventListener("click", function (e) {
    var link = e.target && e.target.closest ? e.target.closest("[data-track-product]") : null;
    if (!link) return;
    try {
      fetch("/api/track-click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: Number(link.getAttribute("data-track-product")),
          marketplace: link.getAttribute("data-track-marketplace"),
          placement: link.getAttribute("data-track-placement"),
          page: window.location.pathname
        }),
        keepalive: true
      }).catch(function () {});
    } catch (err) {
      /* tracking must never break the click-through */
    }
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
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        leadError.textContent = "Informe um e-mail válido.";
        leadError.hidden = false;
        document.getElementById("lead-email").focus();
        return;
      }

      var consent = document.getElementById("lead-consent");
      if (consent && !consent.checked) {
        leadError.textContent = "Para receber novidades, marque que concorda com o aviso de privacidade.";
        leadError.hidden = false;
        consent.focus();
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
          consent: !!(consent && consent.checked),
          website: document.getElementById("lead-website").value
        })
      })
        .then(function (r) {
          return r
            .json()
            .catch(function () {
              return {};
            })
            .then(function (data) {
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
            leadError.textContent = res.data.message || "Não foi possível enviar. Tente novamente.";
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
})();
