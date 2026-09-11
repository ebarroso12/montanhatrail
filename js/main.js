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
  // Images that already failed before this script ran (or before the page content was swapped).
  function sweepBrokenImages(root) {
    Array.prototype.forEach.call(root.querySelectorAll("img"), function (img) {
      if (img.getAttribute("src") && img.complete && img.naturalWidth === 0) markBroken(img);
    });
  }

  /* ---------- product gallery ---------- */
  function initGallery(root) {
    var mainImg = root.querySelector("#gallery-main");
    var thumbs = root.querySelectorAll("[data-gallery-src]");
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
  }

  /* ---------- lightbox ---------- */
  var lightbox = document.getElementById("lightbox");
  var lightboxImg = document.getElementById("lightbox-img");
  var lightboxClose = document.getElementById("lightbox-close");
  var lastFocus = null;

  function initLightboxTriggers(root) {
    root.querySelectorAll("[data-lightbox]").forEach(function (trigger) {
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
  }

  function closeLightbox() {
    if (!lightbox || lightbox.hidden) return;
    lightbox.hidden = true;
    lightboxImg.removeAttribute("src");
    document.body.style.overflow = "";
    if (lastFocus && document.body.contains(lastFocus)) lastFocus.focus();
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

  /* ---------- trilha sonora (player do Spotify) ---------- */
  // O iframe só é criado no primeiro clique: antes disso nada do Spotify é
  // carregado. Minimizar só esconde o painel, e a música continua tocando,
  // inclusive ao navegar pelo site (ver "navegação sem recarregar" abaixo).
  var radioOn = false;
  var music = document.getElementById("music");
  if (music) {
    var musicToggle = document.getElementById("music-toggle");
    var musicPanel = document.getElementById("music-panel");
    var musicFrame = document.getElementById("music-frame");
    var musicClose = document.getElementById("music-close");
    var setMusic = function (open) {
      if (open && !musicFrame.firstChild) {
        var iframe = document.createElement("iframe");
        iframe.src = music.getAttribute("data-embed");
        iframe.title = "Player do Spotify: " + music.getAttribute("data-title");
        iframe.allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
        musicFrame.appendChild(iframe);
        radioOn = true;
      }
      musicPanel.hidden = !open;
      music.classList.toggle("is-open", open);
      musicToggle.setAttribute("aria-expanded", String(open));
      // O botão que abriu o player some; o foco vai para o painel e volta ao minimizar.
      if (open) musicClose.focus();
      else musicToggle.focus();
    };
    musicToggle.addEventListener("click", function () {
      setMusic(true);
    });
    musicClose.addEventListener("click", function () {
      setMusic(false);
    });
    musicPanel.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setMusic(false);
    });
  }

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

  /* ---------- cadastro de novidades (formulário do rodapé e pop-up) ---------- */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var INSTAGRAM_RE = /^[A-Za-z0-9._]{1,30}$/;

  // Pop-up: abre sozinho ao entrar no site, some para sempre depois do
  // cadastro e, se a pessoa fechar, só volta depois de alguns dias.
  var POPUP_KEY = "alpins_cadastro";
  var POPUP_DELAY_MS = 1500;
  var POPUP_SNOOZE_DAYS = 7;

  /** "" = nunca decidiu; "feito"; "adiado:<timestamp>"; null = navegador não deixa guardar. */
  function readPopupState() {
    try {
      return window.localStorage.getItem(POPUP_KEY) || "";
    } catch (err) {
      return null;
    }
  }
  function writePopupState(value) {
    try {
      window.localStorage.setItem(POPUP_KEY, value);
    } catch (err) {
      /* sem armazenamento: nada a lembrar */
    }
  }

  function cleanInstagram(value) {
    return value
      .trim()
      .replace(/^(https?:\/\/)?(www\.)?instagram\.com\//i, "")
      .replace(/[/?#].*$/, "")
      .replace(/^@+/, "");
  }

  function sendLead(payload) {
    return fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(function (r) {
      return r
        .json()
        .catch(function () {
          return {};
        })
        .then(function (data) {
          return { status: r.status, data: data };
        });
    });
  }

  /** Liga um formulário de cadastro cujos campos têm o id "<prefix>-<campo>". */
  function setupLeadForm(prefix, source, onSuccess) {
    var form = document.getElementById(prefix + "-form");
    if (!form) return;
    var success = document.getElementById(prefix + "-success");
    var error = document.getElementById(prefix + "-error");
    var submit = document.getElementById(prefix + "-submit");
    function field(name) {
      return document.getElementById(prefix + "-" + name);
    }
    function fail(message, focusEl) {
      error.textContent = message;
      error.hidden = false;
      if (focusEl) focusEl.focus();
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      success.hidden = true;
      error.hidden = true;

      var name = field("name");
      var email = field("email");
      var instagram = field("instagram");
      var consent = field("consent");
      var insta = instagram ? cleanInstagram(instagram.value) : "";

      if (source === "popup" && !name.value.trim()) return fail("Informe seu nome.", name);
      if (!EMAIL_RE.test(email.value.trim())) return fail("Informe um e-mail válido.", email);
      if (insta && !INSTAGRAM_RE.test(insta)) {
        return fail("Instagram inválido: use só o nome do perfil (ex.: @alpins).", instagram);
      }
      if (!consent.checked) return fail("Para receber novidades, marque que concorda com o aviso de privacidade.", consent);

      submit.disabled = true;
      var label = submit.textContent;
      submit.textContent = "Enviando…";

      sendLead({
        name: name.value.trim(),
        email: email.value.trim(),
        instagram: insta,
        consent: true,
        source: source,
        website: field("website").value
      })
        .then(function (res) {
          if (res.status === 200 && res.data.ok) {
            form.reset();
            success.hidden = false;
            writePopupState("feito");
            if (onSuccess) onSuccess();
          } else {
            fail(res.data.message || "Não foi possível enviar. Tente novamente.", res.data.field ? field(res.data.field) : null);
          }
        })
        .catch(function () {
          fail("Erro de conexão. Tente novamente.");
        })
        .then(function () {
          submit.disabled = false;
          submit.textContent = label;
        });
    });
  }

  var popup = document.getElementById("popup");
  if (popup && typeof popup.showModal === "function") {
    var popupCloseTimer = null;
    var closePopup = function () {
      clearTimeout(popupCloseTimer);
      if (popup.open) popup.close();
    };

    // Fechou sem se cadastrar (X, "Agora não", Esc ou clique fora): adia.
    popup.addEventListener("close", function () {
      if (readPopupState() !== "feito") {
        writePopupState("adiado:" + (Date.now() + POPUP_SNOOZE_DAYS * 24 * 60 * 60 * 1000));
      }
    });
    popup.querySelectorAll("[data-popup-close]").forEach(function (btn) {
      btn.addEventListener("click", closePopup);
    });
    popup.addEventListener("click", function (e) {
      if (e.target === popup) closePopup();
    });

    setupLeadForm("popup", "popup", function () {
      document.getElementById("popup-fields").hidden = true;
      popupCloseTimer = setTimeout(closePopup, 4000);
    });

    var shouldOpenPopup = function () {
      var state = readPopupState();
      if (state === null || state === "feito") return false;
      var snoozed = /^adiado:(\d+)$/.exec(state);
      return !(snoozed && Date.now() < Number(snoozed[1]));
    };
    var openPopup = function () {
      if (popup.open || !shouldOpenPopup()) return;
      // Não abre por cima da imagem ampliada ou de outro diálogo; tenta de novo depois.
      if ((lightbox && !lightbox.hidden) || document.querySelector("dialog[open]")) {
        setTimeout(openPopup, 4000);
        return;
      }
      popup.showModal();
    };
    if (shouldOpenPopup()) setTimeout(openPopup, POPUP_DELAY_MS);
  }

  /* ---------- tudo que vive dentro do conteúdo da página ---------- */
  function initPage(root) {
    initGallery(root);
    initLightboxTriggers(root);
    setupLeadForm("lead", "site");
    sweepBrokenImages(root);
  }
  initPage(document);

  /* ---------- navegação sem recarregar (enquanto a trilha sonora está ligada) ---------- */
  // Com o player do Spotify carregado, os links internos trocam só o conteúdo
  // da página (fetch + histórico do navegador), então a música não para. Sem
  // player, a navegação é a normal. Qualquer falha cai na navegação normal.
  var SOFT_PATHS = /^\/(?:$|catalogo$|privacidade$|categoria\/[^/]+$|produto\/[^/]+$)/;
  var softToken = 0;
  var currentKey = window.location.pathname + window.location.search;

  function softUrl(href) {
    var url;
    try {
      url = new URL(href, window.location.href);
    } catch (err) {
      return null;
    }
    if (url.origin !== window.location.origin || !SOFT_PATHS.test(url.pathname)) return null;
    if (url.searchParams.has("preview")) return null;
    return url;
  }

  function syncHead(doc) {
    document.title = doc.title;
    ['meta[name="description"]', 'meta[name="robots"]', 'link[rel="canonical"]'].forEach(function (selector) {
      var current = document.head.querySelector(selector);
      var next = doc.head.querySelector(selector);
      if (next) next = document.importNode(next, true);
      if (current && next) current.parentNode.replaceChild(next, current);
      else if (current) current.parentNode.removeChild(current);
      else if (next) document.head.appendChild(next);
    });
  }

  function softNavigate(url, push) {
    var token = ++softToken;
    document.documentElement.classList.add("is-loading");
    fetch(url.href, { credentials: "same-origin", headers: { Accept: "text/html" } })
      .then(function (r) {
        if ((r.headers.get("content-type") || "").indexOf("text/html") === -1) throw new Error("resposta não é HTML");
        return r.text();
      })
      .then(function (html) {
        if (token !== softToken) return;
        var doc = new DOMParser().parseFromString(html, "text/html");
        var next = doc.getElementById("conteudo");
        var main = document.getElementById("conteudo");
        if (!next || !main) throw new Error("página sem conteúdo");
        if (push) {
          window.history.replaceState({ soft: true, y: window.scrollY }, "");
          window.history.pushState({ soft: true, y: 0 }, "", url.href);
        }
        currentKey = url.pathname + url.search;
        closeLightbox();
        setNav(false);
        syncHead(doc);
        document.body.className = doc.body.className;
        main.innerHTML = next.innerHTML;
        initPage(main);
        var target = url.hash ? document.getElementById(decodeURIComponent(url.hash.slice(1))) : null;
        if (target) target.scrollIntoView();
        else window.scrollTo(0, push ? 0 : (window.history.state && window.history.state.y) || 0);
        main.setAttribute("tabindex", "-1");
        main.focus({ preventScroll: true });
      })
      .catch(function () {
        // No "voltar" o endereço já mudou: basta recarregar.
        if (push) window.location.assign(url.href);
        else window.location.reload();
      })
      .then(function () {
        if (token === softToken) document.documentElement.classList.remove("is-loading");
      });
  }

  document.addEventListener("click", function (e) {
    if (!radioOn || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var link = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if (!link || (link.target && link.target !== "_self") || link.hasAttribute("download")) return;
    var url = softUrl(link.href);
    if (!url) return;
    // Âncora na própria página (ex.: #catalogo): o navegador só rola.
    if (url.pathname + url.search === currentKey && url.hash) return;
    e.preventDefault();
    window.history.scrollRestoration = "manual";
    softNavigate(url, true);
  });

  // Busca do catálogo (formulário GET).
  document.addEventListener("submit", function (e) {
    if (!radioOn || e.defaultPrevented) return;
    var form = e.target;
    if (!form || String(form.getAttribute("method") || "").toLowerCase() !== "get") return;
    var url = softUrl(form.action);
    if (!url) return;
    url.search = new URLSearchParams(new FormData(form)).toString();
    e.preventDefault();
    window.history.scrollRestoration = "manual";
    softNavigate(url, true);
  });

  window.addEventListener("popstate", function () {
    if (!radioOn) return;
    var key = window.location.pathname + window.location.search;
    if (key === currentKey) return; // só mudou a âncora
    var url = softUrl(window.location.href);
    if (url) softNavigate(url, false);
    else window.location.reload();
  });

  /* ---------- app no celular (instalar na tela inicial) ---------- */
  var appBox = document.getElementById("app-install");
  if (appBox) {
    var appButton = document.getElementById("app-install-button");
    var appIos = document.getElementById("app-install-ios");
    var appOther = document.getElementById("app-install-other");
    var standalone =
      (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
    if (standalone) {
      appBox.hidden = true;
    } else {
      var isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      appIos.hidden = !isIos;
      appOther.hidden = isIos;
      var installPrompt = null;
      // Android/Chrome: o próprio navegador avisa quando dá para instalar.
      window.addEventListener("beforeinstallprompt", function (e) {
        e.preventDefault();
        installPrompt = e;
        appButton.hidden = false;
        appOther.hidden = true;
      });
      appButton.addEventListener("click", function () {
        if (!installPrompt) return;
        installPrompt.prompt();
        installPrompt.userChoice
          .catch(function () {})
          .then(function () {
            installPrompt = null;
            appButton.hidden = true;
            appOther.hidden = isIos;
          });
      });
      window.addEventListener("appinstalled", function () {
        appBox.hidden = true;
      });
    }
  }
})();
