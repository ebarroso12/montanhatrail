(function () {
  'use strict';

  /* ================= helpers ================= */

  function $(id) {
    return document.getElementById(id);
  }

  /** Builds DOM nodes without innerHTML, so data from the API is never parsed as HTML. */
  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        var value = attrs[key];
        if (value == null || value === false) return;
        if (key === 'class') el.className = value;
        else if (key === 'text') el.textContent = value;
        else if (key.slice(0, 2) === 'on') el.addEventListener(key.slice(2), value);
        else el.setAttribute(key, value === true ? '' : value);
      });
    }
    (children || []).forEach(function (child) {
      if (child == null || child === false) return;
      el.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return el;
  }

  function clear(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function api(path, options) {
    var opts = options || {};
    var init = { method: opts.method || 'GET', headers: {}, credentials: 'same-origin' };
    if (opts.body !== undefined) {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(opts.body);
    }
    return fetch('/api/admin/' + path, init).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        if (r.status === 401) {
          window.location.replace('/admin/login');
          throw new Error('Sessão expirada. Entre novamente.');
        }
        if (!r.ok) {
          var err = new Error(data.message || 'Não foi possível concluir a operação.');
          err.field = data.field;
          err.status = r.status;
          throw err;
        }
        return data;
      });
    });
  }

  var toastTimer = null;
  function toast(message) {
    var el = $('toast');
    el.textContent = message;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 3500);
  }

  function showMsg(box, message) {
    box.textContent = message;
    box.hidden = false;
  }

  function hideMsg(box) {
    box.hidden = true;
    box.textContent = '';
  }

  var BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    } catch (e) {
      return iso;
    }
  }

  function moneyInput(value) {
    return value == null ? '' : Number(value).toFixed(2).replace('.', ',');
  }

  function slugify(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80)
      .replace(/-+$/g, '');
  }

  function debounce(fn, ms) {
    var timer;
    return function () {
      clearTimeout(timer);
      timer = setTimeout(fn, ms);
    };
  }

  function plural(n, one, many) {
    return n + ' ' + (n === 1 ? one : many);
  }

  function isHttpsUrl(value) {
    return /^https:\/\/\S+$/i.test(value);
  }

  /* ================= dialogs ================= */

  function openDialog(dialog) {
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
  }

  function closeDialog(dialog) {
    if (typeof dialog.close === 'function') {
      if (dialog.open) dialog.close();
    } else {
      dialog.removeAttribute('open');
    }
  }

  function setBusy(dialog, busy) {
    dialog.classList.toggle('is-busy', busy);
    dialog.querySelectorAll('.admin-dialog-foot button').forEach(function (b) { b.disabled = busy; });
  }

  function clearFieldErrors(form) {
    form.querySelectorAll('.has-error').forEach(function (el) { el.classList.remove('has-error'); });
  }

  function showFormError(form, box, err) {
    showMsg(box, err.message);
    var target = null;
    if (err.field === 'galleryUrls') target = $('p-gallery-url');
    else if (err.field === 'categoryIds') target = document.querySelector('#p-categories input:not(:disabled)');
    else if (err.field && form.elements[err.field] && form.elements[err.field].nodeType) target = form.elements[err.field];
    if (target) {
      var wrap = target.closest('.admin-field');
      if (wrap) wrap.classList.add('has-error');
      target.focus();
    }
    box.scrollIntoView({ block: 'nearest' });
  }

  function requestClose(dialog) {
    if (dialog.id === 'product-dialog' && editor.dirty && !window.confirm('Descartar as alterações não salvas?')) return;
    closeDialog(dialog);
  }

  document.querySelectorAll('dialog').forEach(function (dialog) {
    dialog.querySelectorAll('[data-close]').forEach(function (btn) {
      btn.addEventListener('click', function () { requestClose(dialog); });
    });
    dialog.addEventListener('cancel', function (e) {
      e.preventDefault();
      requestClose(dialog);
    });
  });

  /**
   * Deletion always goes through this dialog. `typeToConfirm` makes the user
   * type a word (e.g. the category name) before the button works; `blocked`
   * shows the explanation without any confirm button.
   */
  function confirmDelete(opts) {
    var dialog = $('confirm-dialog');
    var input = $('confirm-type');
    var errorBox = $('confirm-error');
    var ok = $('confirm-ok');

    $('confirm-title').textContent = opts.title;
    $('confirm-message').textContent = opts.message;
    hideMsg(errorBox);
    input.value = '';
    $('confirm-type-wrap').hidden = !opts.typeToConfirm;
    if (opts.typeToConfirm) $('confirm-type-label').textContent = 'Para confirmar, digite: ' + opts.typeToConfirm;
    ok.hidden = !!opts.blocked;
    ok.disabled = false;
    ok.textContent = opts.confirmLabel || 'Excluir';

    $('confirm-form').onsubmit = function (e) {
      e.preventDefault();
      if (opts.blocked) return;
      if (opts.typeToConfirm && input.value.trim() !== opts.typeToConfirm) {
        showMsg(errorBox, 'O texto digitado não confere.');
        input.focus();
        return;
      }
      ok.disabled = true;
      opts.onConfirm()
        .then(function () { closeDialog(dialog); })
        .catch(function (err) {
          showMsg(errorBox, err.message);
          ok.disabled = false;
        });
    };

    openDialog(dialog);
    (opts.typeToConfirm ? input : dialog.querySelector('[data-close]')).focus();
  }

  /* ================= state ================= */

  var state = {
    categories: [],
    productPage: 1,
    productRequest: 0,
    storageConfigured: true,
    loaded: {},
  };

  var editor = { product: null, gallery: [], slugTouched: false, dirty: false };
  var categoryEditor = { category: null, slugTouched: false };

  /* ================= tabs ================= */

  var loaders = {
    painel: loadStats,
    produtos: loadProducts,
    categorias: loadCategories,
    leads: loadLeads,
    cliques: loadClicks,
    conteudo: function () {
      if (!state.loaded.content) loadContent();
    },
  };

  function activateTab(key, updateHash) {
    var tab = document.querySelector('.admin-tab[data-tab="' + key + '"]');
    if (!tab) return;
    document.querySelectorAll('.admin-tab').forEach(function (t) {
      var active = t === tab;
      t.classList.toggle('is-active', active);
      t.setAttribute('aria-selected', String(active));
    });
    document.querySelectorAll('.admin-panel').forEach(function (panel) {
      panel.classList.toggle('is-active', panel.id === 'panel-' + key);
    });
    if (updateHash) history.replaceState(null, '', '#' + key);
    if (loaders[key]) loaders[key]();
  }

  document.querySelectorAll('.admin-tab').forEach(function (tab) {
    tab.addEventListener('click', function () { activateTab(tab.dataset.tab, true); });
  });

  /* ================= dashboard ================= */

  function loadStats() {
    return api('stats')
      .then(function (s) {
        var box = $('stats');
        clear(box);
        [
          [s.products.total, 'Produtos cadastrados'],
          [s.products.active, 'Produtos ativos'],
          [s.products.featured, 'Em destaque'],
          [s.categories.total, 'Categorias · ' + s.categories.active + ' ativas'],
          [s.products.withoutLinks, 'Sem link de compra'],
          [s.leads, 'Leads'],
          [s.clicks7d, 'Cliques em 7 dias'],
        ].forEach(function (item) {
          box.appendChild(h('div', { class: 'admin-stat' }, [
            h('span', { class: 'num', text: String(item[0]) }),
            h('span', { class: 'label', text: item[1] }),
          ]));
        });
        state.storageConfigured = s.storageConfigured;
        $('storage-warning').hidden = s.storageConfigured;
        document.querySelectorAll('[data-upload]').forEach(function (el) { el.hidden = !s.storageConfigured; });
      })
      .catch(function (err) {
        $('stats').textContent = err.message;
      });
  }

  /* ================= categories ================= */

  function loadCategories() {
    return api('categories')
      .then(function (data) {
        state.categories = data.categories;
        renderCategories();
        fillCategorySelects();
        return data.categories;
      })
      .catch(function (err) {
        $('categories-list').textContent = err.message;
        return [];
      });
  }

  function fillCategorySelects() {
    var filter = $('filter-category');
    var filterValue = filter.value;
    clear(filter);
    filter.appendChild(h('option', { value: '', text: 'Todas as categorias' }));

    var select = $('p-category');
    var selectValue = select.value;
    clear(select);
    select.appendChild(h('option', { value: '', text: 'Selecione a categoria principal' }));

    state.categories.forEach(function (cat) {
      var label = cat.name + (cat.active ? '' : ' (inativa)');
      filter.appendChild(h('option', { value: String(cat.id), text: label }));
      select.appendChild(h('option', { value: String(cat.id), text: label }));
    });
    filter.value = filterValue;
    select.value = selectValue;
  }

  function renderCategories() {
    var list = $('categories-list');
    clear(list);
    if (!state.categories.length) {
      list.appendChild(h('div', { class: 'admin-empty' }, [
        'Nenhuma categoria cadastrada. ',
        h('button', { type: 'button', class: 'admin-btn-link', text: 'Criar a primeira categoria', onclick: function () { openCategoryEditor(null); } }),
      ]));
      return;
    }

    var rows = h('div', { class: 'admin-rows' });
    var last = state.categories.length - 1;
    state.categories.forEach(function (cat, index) {
      rows.appendChild(h('article', { class: 'admin-row admin-row-cat' }, [
        h('div', { class: 'admin-order' }, [
          h('button', { type: 'button', class: 'admin-icon-btn', 'aria-label': 'Mover ' + cat.name + ' para cima', disabled: index === 0, onclick: function () { moveCategory(index, -1); } }, ['↑']),
          h('button', { type: 'button', class: 'admin-icon-btn', 'aria-label': 'Mover ' + cat.name + ' para baixo', disabled: index === last, onclick: function () { moveCategory(index, 1); } }, ['↓']),
        ]),
        h('div', { class: 'admin-row-main' }, [
          h('p', { class: 'admin-row-title', text: cat.name }),
          h('div', { class: 'admin-row-meta' }, [
            h('span', { text: '/categoria/' + cat.slug }),
            h('span', { text: plural(cat.productCount, 'produto', 'produtos') }),
            h('span', { class: 'pill ' + (cat.active ? 'pill-on' : 'pill-off'), text: cat.active ? 'Ativa' : 'Inativa' }),
          ]),
        ]),
        h('div', { class: 'admin-row-actions' }, [
          h('button', { type: 'button', class: 'admin-btn admin-btn-outline admin-btn-sm', text: 'Editar', onclick: function () { openCategoryEditor(cat); } }),
          h('button', { type: 'button', class: 'admin-btn admin-btn-outline admin-btn-sm', text: cat.active ? 'Desativar' : 'Ativar', onclick: function () { toggleCategory(cat); } }),
          h('button', { type: 'button', class: 'admin-btn admin-btn-danger-outline admin-btn-sm', text: 'Excluir', onclick: function () { deleteCategory(cat); } }),
        ]),
      ]));
    });
    list.appendChild(rows);
  }

  function moveCategory(index, delta) {
    var ids = state.categories.map(function (c) { return c.id; });
    var target = index + delta;
    if (target < 0 || target >= ids.length) return;
    var tmp = ids[index];
    ids[index] = ids[target];
    ids[target] = tmp;
    api('categories', { method: 'POST', body: { action: 'reorder', ids: ids } })
      .then(function () {
        toast('Ordem das categorias atualizada.');
        return loadCategories();
      })
      .catch(function (err) { toast(err.message); });
  }

  function toggleCategory(cat) {
    api('categories?id=' + cat.id, { method: 'PATCH', body: { active: !cat.active } })
      .then(function () {
        toast(cat.active ? 'Categoria desativada: ela e os produtos dela saíram do site.' : 'Categoria ativada.');
        loadCategories();
        loadStats();
      })
      .catch(function (err) { toast(err.message); });
  }

  function deleteCategory(cat) {
    if (cat.productCount > 0) {
      confirmDelete({
        title: 'Não é possível excluir',
        message: 'A categoria "' + cat.name + '" tem ' + plural(cat.productCount, 'produto', 'produtos') + '. Tire essa categoria desses produtos (na edição de cada um) ou exclua-os antes. Se quiser só tirar do site, use Desativar.',
        blocked: true,
      });
      return;
    }
    confirmDelete({
      title: 'Excluir categoria',
      message: 'A categoria "' + cat.name + '" será excluída definitivamente.',
      typeToConfirm: cat.name,
      onConfirm: function () {
        return api('categories?id=' + cat.id, { method: 'DELETE' }).then(function () {
          toast('Categoria excluída.');
          loadCategories();
          loadStats();
        });
      },
    });
  }

  function updateCategorySlugPreview() {
    var form = $('category-form');
    $('c-slug-preview').textContent = form.elements.slug.value || slugify(form.elements.name.value) || '…';
  }

  function openCategoryEditor(cat) {
    var form = $('category-form');
    form.reset();
    clearFieldErrors(form);
    hideMsg($('category-error'));
    categoryEditor.category = cat;
    categoryEditor.slugTouched = !!cat;
    $('category-dialog-title').textContent = cat ? 'Editar categoria' : 'Nova categoria';
    form.elements.name.value = cat ? cat.name : '';
    form.elements.slug.value = cat ? cat.slug : '';
    form.elements.description.value = cat ? cat.description : '';
    form.elements.active.checked = cat ? cat.active : true;
    var maxOrder = state.categories.reduce(function (max, c) { return Math.max(max, c.sortOrder); }, 0);
    form.elements.sortOrder.value = cat ? cat.sortOrder : maxOrder + 10;
    updateCategorySlugPreview();
    openDialog($('category-dialog'));
    form.elements.name.focus();
  }

  (function setupCategoryForm() {
    var form = $('category-form');
    form.elements.name.addEventListener('input', function () {
      if (!categoryEditor.slugTouched) form.elements.slug.value = slugify(form.elements.name.value);
      updateCategorySlugPreview();
    });
    form.elements.slug.addEventListener('input', function () {
      categoryEditor.slugTouched = true;
      updateCategorySlugPreview();
    });
    form.elements.slug.addEventListener('blur', function () {
      form.elements.slug.value = slugify(form.elements.slug.value);
      updateCategorySlugPreview();
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var dialog = $('category-dialog');
      var cat = categoryEditor.category;
      clearFieldErrors(form);
      hideMsg($('category-error'));
      setBusy(dialog, true);
      api(cat ? 'categories?id=' + cat.id : 'categories', {
        method: cat ? 'PUT' : 'POST',
        body: {
          name: form.elements.name.value,
          slug: form.elements.slug.value,
          description: form.elements.description.value,
          active: form.elements.active.checked,
          sortOrder: form.elements.sortOrder.value,
        },
      })
        .then(function () {
          closeDialog(dialog);
          toast(cat ? 'Categoria atualizada.' : 'Categoria criada.');
          loadCategories();
          loadStats();
        })
        .catch(function (err) { showFormError(form, $('category-error'), err); })
        .then(function () { setBusy(dialog, false); });
    });
  })();

  /* ================= products: list ================= */

  function loadProducts() {
    var filters = $('product-filters');
    var params = new URLSearchParams();
    ['q', 'categoryId', 'status'].forEach(function (key) {
      var value = filters.elements[key].value.trim();
      if (value) params.set(key, value);
    });
    params.set('page', String(state.productPage));
    var requestId = ++state.productRequest;

    return api('products?' + params.toString())
      .then(function (data) {
        if (requestId !== state.productRequest) return; // a newer search already started
        renderProducts(data, params.has('q') || params.has('categoryId') || params.has('status'));
      })
      .catch(function (err) {
        $('products-list').textContent = err.message;
      });
  }

  function priceLabel(p) {
    if (p.onSale) return BRL.format(p.salePrice) + ' (de ' + BRL.format(p.price) + ')';
    if (p.price != null) return BRL.format(p.price);
    return 'Sem preço';
  }

  function renderProducts(data, filtered) {
    var list = $('products-list');
    var pager = $('products-pagination');
    clear(list);
    clear(pager);

    if (!data.products.length) {
      list.appendChild(h('div', { class: 'admin-empty' }, filtered
        ? ['Nenhum produto encontrado com esses filtros.']
        : ['Nenhum produto cadastrado ainda. ', h('button', { type: 'button', class: 'admin-btn-link', text: 'Cadastrar o primeiro produto', onclick: function () { openProductEditor(null); } })]));
      return;
    }

    var rows = h('div', { class: 'admin-rows' });
    data.products.forEach(function (p) {
      var linkPills = p.links.length
        ? p.links.map(function (l) { return h('span', { class: 'pill ' + (l.marketplace === 'shopee' ? 'pill-shopee' : 'pill-meli'), text: l.label }); })
        : [h('span', { class: 'pill pill-none', text: 'Sem link de compra' })];

      rows.appendChild(h('article', { class: 'admin-row' }, [
        h('div', { class: 'admin-row-thumb' }, [
          p.mainImageUrl ? h('img', { src: p.mainImageUrl, alt: '', loading: 'lazy', onerror: function () { this.remove(); } }) : null,
        ]),
        h('div', { class: 'admin-row-main' }, [
          h('p', { class: 'admin-row-title', text: p.name }),
          h('div', { class: 'admin-row-meta' }, [
            h('span', { text: p.categories.map(function (c) { return c.name + (c.active ? '' : ' (inativa)'); }).join(' · ') }),
            h('span', { text: priceLabel(p) }),
            h('span', { class: 'pill ' + (p.active ? 'pill-on' : 'pill-off'), text: p.active ? 'Ativo' : 'Inativo' }),
            p.featured ? h('span', { class: 'pill pill-star', text: 'Destaque' }) : null,
          ].concat(linkPills)),
        ]),
        h('div', { class: 'admin-row-actions' }, [
          h('button', { type: 'button', class: 'admin-btn admin-btn-outline admin-btn-sm', text: 'Editar', onclick: function () { openProductEditor(p); } }),
          h('a', { class: 'admin-btn admin-btn-outline admin-btn-sm', href: '/produto/' + encodeURIComponent(p.slug) + '?preview=1', target: '_blank', rel: 'noopener noreferrer', text: 'Visualizar ↗' }),
          h('button', { type: 'button', class: 'admin-btn admin-btn-outline admin-btn-sm', text: p.active ? 'Desativar' : 'Ativar', onclick: function () { patchProduct(p, { active: !p.active }, p.active ? 'Produto desativado.' : 'Produto ativado.'); } }),
          h('button', { type: 'button', class: 'admin-btn admin-btn-outline admin-btn-sm', text: p.featured ? 'Tirar destaque' : 'Destacar', onclick: function () { patchProduct(p, { featured: !p.featured }, p.featured ? 'Destaque removido.' : 'Produto em destaque.'); } }),
          h('button', { type: 'button', class: 'admin-btn admin-btn-danger-outline admin-btn-sm', text: 'Excluir', onclick: function () { deleteProduct(p); } }),
        ]),
      ]));
    });
    list.appendChild(rows);

    var totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
    pager.appendChild(h('span', { text: plural(data.total, 'produto', 'produtos') + ' · página ' + data.page + ' de ' + totalPages }));
    if (totalPages > 1) {
      pager.appendChild(h('span', { class: 'admin-actions' }, [
        h('button', { type: 'button', class: 'admin-btn admin-btn-outline admin-btn-sm', text: '← Anterior', disabled: data.page <= 1, onclick: function () { state.productPage = data.page - 1; loadProducts(); } }),
        h('button', { type: 'button', class: 'admin-btn admin-btn-outline admin-btn-sm', text: 'Próxima →', disabled: data.page >= totalPages, onclick: function () { state.productPage = data.page + 1; loadProducts(); } }),
      ]));
    }
  }

  function patchProduct(p, changes, message) {
    api('products?id=' + p.id, { method: 'PATCH', body: changes })
      .then(function () {
        toast(message);
        loadProducts();
        loadStats();
      })
      .catch(function (err) { toast(err.message); });
  }

  function deleteProduct(p) {
    confirmDelete({
      title: 'Excluir produto',
      message: 'Excluir "' + p.name + '"? Esta ação não pode ser desfeita. Para apenas tirar o produto do site, use Desativar.',
      onConfirm: function () {
        return api('products?id=' + p.id, { method: 'DELETE' }).then(function () {
          toast('Produto excluído.');
          loadProducts();
          loadStats();
          loadCategories();
        });
      },
    });
  }

  (function setupProductFilters() {
    var filters = $('product-filters');
    var reload = function () {
      state.productPage = 1;
      loadProducts();
    };
    filters.elements.q.addEventListener('input', debounce(reload, 300));
    filters.elements.categoryId.addEventListener('change', reload);
    filters.elements.status.addEventListener('change', reload);
    filters.addEventListener('submit', function (e) {
      e.preventDefault();
      reload();
    });
  })();

  /* ================= products: images ================= */

  function resizeImage(file, maxDim, quality) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (e) {
        var img = new Image();
        img.onload = function () {
          var scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          var canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          var ctx = canvas.getContext('2d');
          ctx.fillStyle = '#fff'; // JPEG has no transparency: keep PNG backgrounds white, not black
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(function (blob) {
            if (!blob) {
              reject(new Error('Não foi possível processar a imagem.'));
              return;
            }
            var r2 = new FileReader();
            r2.onload = function (e2) { resolve(String(e2.target.result).split(',')[1]); };
            r2.onerror = function () { reject(new Error('Não foi possível processar a imagem.')); };
            r2.readAsDataURL(blob);
          }, 'image/jpeg', quality);
        };
        img.onerror = function () { reject(new Error('Arquivo de imagem inválido.')); };
        img.src = e.target.result;
      };
      reader.onerror = function () { reject(new Error('Não foi possível ler o arquivo.')); };
      reader.readAsDataURL(file);
    });
  }

  function uploadFile(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      return Promise.reject(new Error('Formato não suportado. Envie JPG, PNG ou WebP.'));
    }
    if (file.size > 20 * 1024 * 1024) {
      return Promise.reject(new Error('Arquivo muito grande (máximo 20 MB antes da compressão).'));
    }
    return resizeImage(file, 1600, 0.85)
      .then(function (base64) { return api('upload', { method: 'POST', body: { imageBase64: base64 } }); })
      .then(function (data) { return data.url; });
  }

  function markDirty() {
    editor.dirty = true;
  }

  function renderMainPreview() {
    var box = $('p-main-preview');
    var url = $('p-main-image').value.trim();
    clear(box);
    if (!url) {
      box.textContent = 'Sem imagem';
      return;
    }
    box.appendChild(h('img', {
      src: url,
      alt: 'Pré-visualização da imagem principal',
      onerror: function () { box.textContent = 'Não foi possível carregar esta imagem'; },
    }));
  }

  function renderGallery() {
    var grid = $('p-gallery');
    clear(grid);
    var last = editor.gallery.length - 1;
    editor.gallery.forEach(function (url, index) {
      grid.appendChild(h('div', { class: 'admin-gallery-item' }, [
        h('img', { src: url, alt: 'Imagem ' + (index + 1) + ' da galeria', loading: 'lazy' }),
        h('div', { class: 'admin-gallery-tools' }, [
          h('button', { type: 'button', 'aria-label': 'Mover imagem ' + (index + 1) + ' para a esquerda', disabled: index === 0, onclick: function () { moveGallery(index, -1); } }, ['←']),
          h('button', { type: 'button', 'aria-label': 'Usar imagem ' + (index + 1) + ' como principal', title: 'Usar como principal', onclick: function () { promoteGallery(index); } }, ['★']),
          h('button', { type: 'button', 'aria-label': 'Mover imagem ' + (index + 1) + ' para a direita', disabled: index === last, onclick: function () { moveGallery(index, 1); } }, ['→']),
          h('button', { type: 'button', 'aria-label': 'Remover imagem ' + (index + 1), onclick: function () { editor.gallery.splice(index, 1); markDirty(); renderGallery(); } }, ['✕']),
        ]),
      ]));
    });
  }

  function moveGallery(index, delta) {
    var target = index + delta;
    var tmp = editor.gallery[index];
    editor.gallery[index] = editor.gallery[target];
    editor.gallery[target] = tmp;
    markDirty();
    renderGallery();
  }

  /** Swap: the chosen gallery image becomes the main one (the old main goes to the gallery). */
  function promoteGallery(index) {
    var input = $('p-main-image');
    var previous = input.value.trim();
    input.value = editor.gallery[index];
    if (previous) editor.gallery[index] = previous;
    else editor.gallery.splice(index, 1);
    markDirty();
    renderMainPreview();
    renderGallery();
  }

  function addGalleryUrl(url) {
    if (editor.gallery.length >= 12) {
      showMsg($('product-error'), 'A galeria aceita no máximo 12 imagens.');
      return false;
    }
    editor.gallery.push(url);
    markDirty();
    renderGallery();
    return true;
  }

  function withUploadBusy(input, promise) {
    var label = input.closest('label');
    var text = label.querySelector('span');
    var original = text.textContent;
    label.classList.add('is-busy');
    text.textContent = 'Enviando…';
    return promise.then(
      function () {
        label.classList.remove('is-busy');
        text.textContent = original;
        input.value = '';
      },
      function (err) {
        label.classList.remove('is-busy');
        text.textContent = original;
        input.value = '';
        showMsg($('product-error'), err.message);
      }
    );
  }

  (function setupImageControls() {
    var mainInput = $('p-main-image');
    mainInput.addEventListener('change', renderMainPreview);
    $('p-main-clear').addEventListener('click', function () {
      mainInput.value = '';
      markDirty();
      renderMainPreview();
    });

    $('p-main-file').addEventListener('change', function () {
      var input = this;
      var file = input.files && input.files[0];
      if (!file) return;
      hideMsg($('product-error'));
      withUploadBusy(input, uploadFile(file).then(function (url) {
        mainInput.value = url;
        markDirty();
        renderMainPreview();
      }));
    });

    $('p-gallery-files').addEventListener('change', function () {
      var input = this;
      var files = Array.prototype.slice.call(input.files || []);
      if (!files.length) return;
      hideMsg($('product-error'));
      var chain = files.reduce(function (promise, file) {
        return promise.then(function () {
          if (editor.gallery.length >= 12) throw new Error('A galeria aceita no máximo 12 imagens.');
          return uploadFile(file).then(addGalleryUrl);
        });
      }, Promise.resolve());
      withUploadBusy(input, chain);
    });

    $('p-gallery-add-url').addEventListener('click', function () {
      var field = $('p-gallery-url');
      var url = field.value.trim();
      if (!url) return;
      if (!isHttpsUrl(url) && url.indexOf('/images/') !== 0) {
        showMsg($('product-error'), 'Informe uma URL de imagem começando com https://');
        field.focus();
        return;
      }
      if (addGalleryUrl(url)) field.value = '';
    });
  })();

  /* ================= products: editor ================= */

  function updateSlugPreview() {
    var form = $('product-form');
    $('p-slug-preview').textContent = form.elements.slug.value || slugify(form.elements.name.value) || '…';
  }

  function updateTestLinks() {
    [['p-shopee', 'p-shopee-test'], ['p-mercadolivre', 'p-mercadolivre-test']].forEach(function (pair) {
      var value = $(pair[0]).value.trim();
      var link = $(pair[1]);
      link.hidden = !isHttpsUrl(value);
      if (isHttpsUrl(value)) link.href = value;
    });
  }

  /** Checkboxes "Também aparece em": the main category is always checked and locked. */
  function renderCategoryChecks(selected) {
    var box = $('p-categories');
    var mainId = $('p-category').value;
    clear(box);
    state.categories.forEach(function (cat) {
      var id = String(cat.id);
      var isMain = id === mainId;
      box.appendChild(h('label', { class: 'admin-check', for: 'p-cat-' + id }, [
        h('input', { type: 'checkbox', id: 'p-cat-' + id, value: id, checked: isMain || selected.indexOf(id) !== -1, disabled: isMain }),
        h('span', { text: cat.name + (cat.active ? '' : ' (inativa)') + (isMain ? ' — principal' : '') }),
      ]));
    });
  }

  function selectedCategoryIds() {
    return Array.prototype.map.call($('p-categories').querySelectorAll('input:checked'), function (input) {
      return input.value;
    });
  }

  function openProductEditor(product) {
    if (!state.categories.length) {
      loadCategories().then(function (categories) {
        if (categories.length) {
          openProductEditor(product);
        } else {
          toast('Crie uma categoria antes de cadastrar produtos.');
          activateTab('categorias', true);
        }
      });
      return;
    }

    var form = $('product-form');
    var el = form.elements;
    form.reset();
    clearFieldErrors(form);
    hideMsg($('product-error'));

    editor.product = product;
    editor.gallery = product ? product.galleryUrls.slice() : [];
    editor.slugTouched = !!product;
    editor.dirty = false;

    $('product-dialog-title').textContent = product ? 'Editar produto' : 'Novo produto';
    el.name.value = product ? product.name : '';
    el.slug.value = product ? product.slug : '';
    el.categoryId.value = product ? String(product.categoryId) : '';
    renderCategoryChecks(product ? product.categoryIds.map(String) : []);
    el.shortDescription.value = product ? product.shortDescription : '';
    el.description.value = product ? product.description : '';
    el.mainImageUrl.value = product && product.mainImageUrl ? product.mainImageUrl : '';
    el.price.value = product ? moneyInput(product.price) : '';
    el.salePrice.value = product ? moneyInput(product.salePrice) : '';
    el.shopeeUrl.value = product && product.shopeeUrl ? product.shopeeUrl : '';
    el.mercadolivreUrl.value = product && product.mercadolivreUrl ? product.mercadolivreUrl : '';
    el.active.checked = product ? product.active : false;
    el.featured.checked = product ? product.featured : false;
    el.sortOrder.value = product ? product.sortOrder : 0;

    renderMainPreview();
    renderGallery();
    updateSlugPreview();
    updateTestLinks();
    openDialog($('product-dialog'));
    el.name.focus();
  }

  function collectProduct() {
    var el = $('product-form').elements;
    return {
      name: el.name.value,
      slug: el.slug.value,
      categoryId: el.categoryId.value,
      categoryIds: selectedCategoryIds(),
      shortDescription: el.shortDescription.value,
      description: el.description.value,
      mainImageUrl: el.mainImageUrl.value,
      galleryUrls: editor.gallery.slice(),
      price: el.price.value,
      salePrice: el.salePrice.value,
      shopeeUrl: el.shopeeUrl.value,
      mercadolivreUrl: el.mercadolivreUrl.value,
      active: el.active.checked,
      featured: el.featured.checked,
      sortOrder: el.sortOrder.value,
    };
  }

  function saveProduct(withPreview) {
    var form = $('product-form');
    var dialog = $('product-dialog');
    var product = editor.product;
    clearFieldErrors(form);
    hideMsg($('product-error'));

    // Open the tab during the click itself so popup blockers allow it.
    var previewWindow = withPreview ? window.open('about:blank', '_blank') : null;

    setBusy(dialog, true);
    api(product ? 'products?id=' + product.id : 'products', { method: product ? 'PUT' : 'POST', body: collectProduct() })
      .then(function (data) {
        editor.dirty = false;
        toast(product ? 'Produto atualizado.' : 'Produto criado.');
        loadProducts();
        loadStats();
        loadCategories();
        if (previewWindow) {
          previewWindow.opener = null;
          previewWindow.location.href = '/produto/' + encodeURIComponent(data.product.slug) + '?preview=1';
          // Keep editing the saved product (next save updates it instead of creating another).
          editor.product = data.product;
          editor.slugTouched = true;
          form.elements.slug.value = data.product.slug;
          $('product-dialog-title').textContent = 'Editar produto';
        } else {
          closeDialog(dialog);
        }
      })
      .catch(function (err) {
        if (previewWindow) previewWindow.close();
        showFormError(form, $('product-error'), err);
      })
      .then(function () { setBusy(dialog, false); });
  }

  (function setupProductForm() {
    var form = $('product-form');
    form.addEventListener('input', markDirty);
    form.addEventListener('change', markDirty);
    form.elements.name.addEventListener('input', function () {
      if (!editor.slugTouched) form.elements.slug.value = slugify(form.elements.name.value);
      updateSlugPreview();
    });
    form.elements.slug.addEventListener('input', function () {
      editor.slugTouched = true;
      updateSlugPreview();
    });
    form.elements.slug.addEventListener('blur', function () {
      form.elements.slug.value = slugify(form.elements.slug.value);
      updateSlugPreview();
    });
    form.elements.categoryId.addEventListener('change', function () {
      renderCategoryChecks(selectedCategoryIds());
    });
    form.elements.shopeeUrl.addEventListener('input', updateTestLinks);
    form.elements.mercadolivreUrl.addEventListener('input', updateTestLinks);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      saveProduct(false);
    });
    $('product-save-preview').addEventListener('click', function () { saveProduct(true); });
  })();

  document.querySelectorAll('[data-action="new-product"]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      activateTab('produtos', true);
      openProductEditor(null);
    });
  });
  document.querySelectorAll('[data-action="new-category"]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      activateTab('categorias', true);
      openCategoryEditor(null);
    });
  });

  /* ================= leads & clicks ================= */

  function table(headers, rows) {
    return h('div', { class: 'admin-table-wrap' }, [
      h('table', { class: 'admin-table' }, [
        h('thead', null, [h('tr', null, headers.map(function (title) { return h('th', { text: title }); }))]),
        h('tbody', null, rows.map(function (cells) {
          return h('tr', null, cells.map(function (cell) {
            return h('td', null, [typeof cell === 'string' ? cell : cell]);
          }));
        })),
      ]),
    ]);
  }

  function loadLeads() {
    var box = $('leads-content');
    api('leads')
      .then(function (data) {
        clear(box);
        var leads = data.leads || [];
        if (!leads.length) {
          box.appendChild(h('div', { class: 'admin-empty', text: 'Nenhum lead recebido ainda.' }));
          return;
        }
        box.appendChild(table(['Data', 'Nome', 'E-mail', 'Origem', ''], leads.map(function (lead) {
          return [
            formatDate(lead.created_at),
            lead.name || '—',
            lead.email,
            lead.source || '—',
            h('button', { type: 'button', class: 'admin-btn admin-btn-danger-outline admin-btn-sm', text: 'Excluir', onclick: function () { deleteLead(lead); } }),
          ];
        })));
      })
      .catch(function (err) { box.textContent = err.message; });
  }

  /** LGPD: remove a lead when the person asks for their data to be deleted. */
  function deleteLead(lead) {
    confirmDelete({
      title: 'Excluir cadastro',
      message: 'Excluir o cadastro de ' + lead.email + '? Use quando a pessoa pedir a remoção dos dados. Esta ação não pode ser desfeita.',
      onConfirm: function () {
        return api('leads?id=' + encodeURIComponent(lead.id), { method: 'DELETE' }).then(function () {
          toast('Cadastro excluído.');
          loadLeads();
          loadStats();
        });
      },
    });
  }

  var MARKETPLACE_LABELS = { shopee: 'Shopee', mercadolivre: 'Mercado Livre' };

  function loadClicks() {
    var box = $('clicks-content');
    api('clicks')
      .then(function (data) {
        clear(box);
        box.appendChild(h('div', { class: 'admin-stat-row' }, [
          h('div', { class: 'admin-stat' }, [h('span', { class: 'num', text: String(data.total) }), h('span', { class: 'label', text: 'Total de cliques' })]),
          h('div', { class: 'admin-stat' }, [h('span', { class: 'num', text: String(data.last7) }), h('span', { class: 'label', text: 'Últimos 7 dias' })]),
        ]));

        box.appendChild(h('h3', { class: 'admin-subtitle', text: 'Por produto' }));
        if (!data.byProduct.length) {
          box.appendChild(h('div', { class: 'admin-empty', text: 'Nenhum clique em produtos do catálogo ainda.' }));
        } else {
          box.appendChild(table(['Produto', 'Marketplace', 'Total', '7 dias'], data.byProduct.map(function (row) {
            return [row.productName || 'Produto excluído', MARKETPLACE_LABELS[row.marketplace] || row.marketplace, String(row.total), String(row.last7)];
          })));
        }

        if (data.legacy.length) {
          box.appendChild(h('details', { class: 'admin-details' }, [
            h('summary', { text: 'Histórico do site antigo (antes do catálogo)' }),
            table(['Botão', 'Cliques'], data.legacy.map(function (row) { return [row.label, String(row.total)]; })),
          ]));
        }
      })
      .catch(function (err) { box.textContent = err.message; });
  }

  /* ================= content ================= */

  function loadContent() {
    var form = $('content-form');
    api('content')
      .then(function (data) {
        state.loaded.content = true;
        var content = data.content || {};
        ['hero_eyebrow', 'hero_title_line1', 'hero_title_line2', 'hero_subtitle', 'promo_banner_text'].forEach(function (key) {
          form.elements[key].value = content[key] || '';
        });
        form.elements.promo_banner_enabled.checked = content.promo_banner_enabled === 'true';
      })
      .catch(function (err) { showMsg($('content-error'), err.message); });
  }

  $('content-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var form = this;
    hideMsg($('content-success'));
    hideMsg($('content-error'));
    var payload = {};
    ['hero_eyebrow', 'hero_title_line1', 'hero_title_line2', 'hero_subtitle', 'promo_banner_text'].forEach(function (key) {
      payload[key] = form.elements[key].value;
    });
    payload.promo_banner_enabled = form.elements.promo_banner_enabled.checked ? 'true' : 'false';
    api('content', { method: 'POST', body: { content: payload } })
      .then(function () { showMsg($('content-success'), 'Salvo com sucesso. O site é atualizado em até 2 minutos.'); })
      .catch(function (err) { showMsg($('content-error'), err.message); });
  });

  /* ================= security ================= */

  $('password-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var form = this;
    hideMsg($('pwd-success'));
    hideMsg($('pwd-error'));
    api('change-password', {
      method: 'POST',
      body: { currentPassword: $('current-password').value, newPassword: $('new-password').value },
    })
      .then(function () {
        showMsg($('pwd-success'), 'Senha alterada. Outros aparelhos que estavam conectados ao painel foram desconectados.');
        form.reset();
      })
      .catch(function (err) { showMsg($('pwd-error'), err.message); });
  });

  $('logout-btn').addEventListener('click', function () {
    api('logout', { method: 'POST', body: {} }).catch(function () {}).then(function () {
      window.location.replace('/admin/login');
    });
  });

  /* ================= init ================= */

  loadCategories();
  var initialTab = window.location.hash.slice(1);
  activateTab(loaders[initialTab] || initialTab === 'seguranca' ? initialTab : 'painel', false);
})();
