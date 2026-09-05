(function(){
  'use strict';

  function escapeHtml(str){
    return String(str == null ? '' : str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function formatDate(iso){
    try{
      var d = new Date(iso);
      return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    }catch(e){ return iso; }
  }

  // ---- Auth guard: bounce to login if the session isn't valid ----
  fetch('/api/admin/session').then(function(r){ return r.json(); }).then(function(data){
    if (!data || !data.authenticated) {
      window.location.replace('/admin/index.html');
    } else {
      init();
    }
  }).catch(function(){
    window.location.replace('/admin/index.html');
  });

  function init(){
    setupTabs();
    setupLogout();
    loadLeads();
    loadClicks();
    setupContentForm();
    setupAlphaContentForm();
    setupAlphaImagesManager();
    setupPasswordForm();
  }

  function setupTabs(){
    var tabs = document.querySelectorAll('.admin-tab');
    tabs.forEach(function(tab){
      tab.addEventListener('click', function(){
        tabs.forEach(function(t){ t.classList.remove('is-active'); });
        document.querySelectorAll('.admin-panel').forEach(function(p){ p.classList.remove('is-active'); });
        tab.classList.add('is-active');
        document.getElementById('panel-' + tab.dataset.tab).classList.add('is-active');
      });
    });
  }

  function setupLogout(){
    document.getElementById('logout-btn').addEventListener('click', function(){
      fetch('/api/admin/logout', { method: 'POST' }).finally(function(){
        window.location.replace('/admin/index.html');
      });
    });
  }

  function loadLeads(){
    fetch('/api/admin/leads').then(function(r){ return r.json(); }).then(function(data){
      var loading = document.getElementById('leads-loading');
      var wrap = document.getElementById('leads-table-wrap');
      var empty = document.getElementById('leads-empty');
      var tbody = document.getElementById('leads-tbody');
      loading.style.display = 'none';

      var leads = data.leads || [];
      if (!leads.length) {
        empty.style.display = 'block';
        return;
      }

      tbody.innerHTML = leads.map(function(lead){
        return '<tr>' +
          '<td>' + escapeHtml(formatDate(lead.created_at)) + '</td>' +
          '<td>' + escapeHtml(lead.name || '—') + '</td>' +
          '<td>' + escapeHtml(lead.email) + '</td>' +
          '<td>' + escapeHtml(lead.phone || '—') + '</td>' +
          '<td>' + escapeHtml(lead.message || '—') + '</td>' +
        '</tr>';
      }).join('');
      wrap.style.display = 'block';
    }).catch(function(){
      document.getElementById('leads-loading').textContent = 'Não foi possível carregar os leads.';
    });
  }

  var CLICK_LABELS = {
    'header-shopee': 'Cabeçalho — Shopee',
    'hero-shopee': 'Topo — Shopee',
    'hero-mercadolivre': 'Topo — Mercado Livre',
    'atributos-shopee': 'Atributos — Shopee',
    'atributos-mercadolivre': 'Atributos — Mercado Livre',
    'tamanhos-shopee': 'Guia de tamanhos — Shopee',
    'cta-final-shopee': 'Chamada final — Shopee',
    'cta-final-mercadolivre': 'Chamada final — Mercado Livre',
    'footer-shopee': 'Rodapé — Shopee',
    'footer-mercadolivre': 'Rodapé — Mercado Livre',
    'alpha-hero-shopee': 'Alpha Run · Topo — Shopee',
    'alpha-hero-mercadolivre': 'Alpha Run · Topo — Mercado Livre',
    'alpha-cta-shopee': 'Alpha Run · Chamada final — Shopee',
    'alpha-cta-mercadolivre': 'Alpha Run · Chamada final — Mercado Livre',
    'alpha-footer-shopee': 'Alpha Run · Rodapé — Shopee',
    'alpha-footer-mercadolivre': 'Alpha Run · Rodapé — Mercado Livre',
    'alpha-lineup-color': 'Alpha Run · Troca de cor'
  };

  function loadClicks(){
    fetch('/api/admin/clicks').then(function(r){ return r.json(); }).then(function(data){
      document.getElementById('clicks-loading').style.display = 'none';
      var content = document.getElementById('clicks-content');
      content.style.display = 'block';

      var stats = document.getElementById('clicks-stats');
      var totals = data.totals || {};
      var last7 = data.last7days || {};
      var labels = Object.keys(CLICK_LABELS);

      var html = '<div class="admin-stat"><span class="num">' + (data.totalClicks || 0) + '</span><span class="label">Total de cliques</span></div>';
      labels.forEach(function(key){
        if (!totals[key]) return;
        html += '<div class="admin-stat"><span class="num">' + totals[key] +
          '</span><span class="label">' + escapeHtml(CLICK_LABELS[key]) +
          ' · ' + (last7[key] || 0) + ' em 7d</span></div>';
      });
      stats.innerHTML = html;
    }).catch(function(){
      document.getElementById('clicks-loading').textContent = 'Não foi possível carregar os cliques.';
    });
  }

  function setupContentForm(){
    var form = document.getElementById('content-form');
    var successBox = document.getElementById('content-success');
    var errorBox = document.getElementById('content-error');

    fetch('/api/admin/content').then(function(r){ return r.json(); }).then(function(data){
      var content = data.content || {};
      Object.keys(content).forEach(function(key){
        var el = form.elements[key];
        if (!el) return;
        if (el.type === 'checkbox') {
          el.checked = content[key] === 'true' || content[key] === true;
        } else {
          el.value = content[key];
        }
      });
    }).catch(function(){});

    form.addEventListener('submit', function(e){
      e.preventDefault();
      successBox.hidden = true;
      errorBox.hidden = true;

      var payload = {
        hero_eyebrow: form.elements.hero_eyebrow.value,
        hero_title_line1: form.elements.hero_title_line1.value,
        hero_title_line2: form.elements.hero_title_line2.value,
        hero_subtitle: form.elements.hero_subtitle.value,
        shopee_url: form.elements.shopee_url.value,
        mercadolivre_url: form.elements.mercadolivre_url.value,
        promo_banner_enabled: form.elements.promo_banner_enabled.checked ? 'true' : 'false',
        promo_banner_text: form.elements.promo_banner_text.value
      };

      fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: payload })
      }).then(function(r){ return r.json().then(function(data){ return { status: r.status, data: data }; }); })
        .then(function(res){
          if (res.status === 200 && res.data.ok) {
            successBox.hidden = false;
          } else {
            errorBox.textContent = res.data.message || 'Não foi possível salvar.';
            errorBox.hidden = false;
          }
        }).catch(function(){
          errorBox.textContent = 'Erro de conexão.';
          errorBox.hidden = false;
        });
    });
  }

  function setupAlphaContentForm(){
    var form = document.getElementById('content-alpha-form');
    if (!form) return;
    var successBox = document.getElementById('content-alpha-success');
    var errorBox = document.getElementById('content-alpha-error');

    fetch('/api/admin/content').then(function(r){ return r.json(); }).then(function(data){
      var content = data.content || {};
      Object.keys(content).forEach(function(key){
        var el = form.elements[key];
        if (!el) return;
        if (el.type === 'checkbox') {
          el.checked = content[key] === 'true' || content[key] === true;
        } else {
          el.value = content[key];
        }
      });
      // alpha_run_active only exists once someone unchecks it and saves —
      // until then, treat "never configured" as active (checked by default).
      if (form.elements.alpha_run_active && !(content.alpha_run_active === 'false')) {
        form.elements.alpha_run_active.checked = true;
      }
    }).catch(function(){});

    form.addEventListener('submit', function(e){
      e.preventDefault();
      successBox.hidden = true;
      errorBox.hidden = true;

      var payload = {
        alpha_run_shopee_url: form.elements.alpha_run_shopee_url.value,
        alpha_run_mercadolivre_url: form.elements.alpha_run_mercadolivre_url.value,
        alpha_run_price_current: form.elements.alpha_run_price_current.value,
        alpha_run_price_original: form.elements.alpha_run_price_original.value,
        alpha_run_promo_enabled: form.elements.alpha_run_promo_enabled.checked ? 'true' : 'false',
        alpha_run_promo_label: form.elements.alpha_run_promo_label.value,
        alpha_run_active: form.elements.alpha_run_active.checked ? 'true' : 'false'
      };

      fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: payload })
      }).then(function(r){ return r.json().then(function(data){ return { status: r.status, data: data }; }); })
        .then(function(res){
          if (res.status === 200 && res.data.ok) {
            successBox.hidden = false;
          } else {
            errorBox.textContent = res.data.message || 'Não foi possível salvar.';
            errorBox.hidden = false;
          }
        }).catch(function(){
          errorBox.textContent = 'Erro de conexão.';
          errorBox.hidden = false;
        });
    });
  }

  /* ---- Alpha Run image manager ---- */
  var ALPHA_COLORS = [
    { key: 'verde', label: 'Preto / Verde' },
    { key: 'azul', label: 'Azul / Limão' },
    { key: 'pink', label: 'Preto / Pink' },
    { key: 'preto', label: 'Preto Total' }
  ];

  function resizeImageFile(file, maxDim, quality){
    return new Promise(function(resolve, reject){
      var reader = new FileReader();
      reader.onload = function(e){
        var img = new Image();
        img.onload = function(){
          var w = img.width, h = img.height;
          var scale = Math.min(1, maxDim / Math.max(w, h));
          var cw = Math.max(1, Math.round(w * scale));
          var ch = Math.max(1, Math.round(h * scale));
          var canvas = document.createElement('canvas');
          canvas.width = cw;
          canvas.height = ch;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, cw, ch);
          canvas.toBlob(function(blob){
            if (!blob) { reject(new Error('toBlob failed')); return; }
            var r2 = new FileReader();
            r2.onload = function(e2){
              resolve({ base64: String(e2.target.result).split(',')[1], contentType: 'image/jpeg' });
            };
            r2.onerror = reject;
            r2.readAsDataURL(blob);
          }, 'image/jpeg', quality);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function setupAlphaImagesManager(){
    var container = document.getElementById('alpha-images-manager');
    if (!container) return;

    function loadImages(){
      container.innerHTML = '<p class="admin-loading">Carregando…</p>';
      fetch('/api/product-images?product=alpha-run').then(function(r){ return r.json(); }).then(function(data){
        var colors = (data && data.colors) || {};
        container.innerHTML = '';
        ALPHA_COLORS.forEach(function(c){
          var wrap = document.createElement('div');
          wrap.className = 'admin-image-color';

          var heading = document.createElement('h3');
          heading.textContent = c.label;
          wrap.appendChild(heading);

          var grid = document.createElement('div');
          grid.className = 'admin-image-grid';

          (colors[c.key] || []).forEach(function(img){
            var thumb = document.createElement('div');
            thumb.className = 'admin-image-thumb';

            var image = document.createElement('img');
            image.src = '/api/product-image?id=' + img.id;
            image.alt = c.label;
            thumb.appendChild(image);

            if (img.isHero) {
              var badge = document.createElement('span');
              badge.className = 'admin-image-hero-badge';
              badge.textContent = 'Capa';
              thumb.appendChild(badge);
            }

            var actions = document.createElement('div');
            actions.className = 'admin-image-thumb-actions';

            if (!img.isHero) {
              var heroBtn = document.createElement('button');
              heroBtn.type = 'button';
              heroBtn.className = 'admin-btn-mini';
              heroBtn.textContent = 'Tornar capa';
              heroBtn.addEventListener('click', function(){
                fetch('/api/product-images', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'setHero', id: img.id })
                }).then(loadImages).catch(function(){ alert('Não foi possível atualizar a capa.'); });
              });
              actions.appendChild(heroBtn);
            }

            var delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.className = 'admin-btn-mini admin-btn-mini-danger';
            delBtn.textContent = 'Remover';
            delBtn.addEventListener('click', function(){
              if (!confirm('Remover esta foto?')) return;
              fetch('/api/product-images', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', id: img.id })
              }).then(loadImages).catch(function(){ alert('Não foi possível remover a foto.'); });
            });
            actions.appendChild(delBtn);

            thumb.appendChild(actions);
            grid.appendChild(thumb);
          });

          var hasImages = (colors[c.key] || []).length > 0;
          var uploadLabel = document.createElement('label');
          uploadLabel.className = 'admin-image-upload';
          var fileInput = document.createElement('input');
          fileInput.type = 'file';
          fileInput.accept = 'image/*';
          fileInput.hidden = true;
          var uploadText = document.createElement('span');
          uploadText.textContent = '+ Enviar foto';
          uploadLabel.appendChild(fileInput);
          uploadLabel.appendChild(uploadText);

          fileInput.addEventListener('change', function(){
            var file = fileInput.files && fileInput.files[0];
            if (!file) return;
            uploadLabel.classList.add('is-uploading');
            uploadText.textContent = 'Enviando…';
            resizeImageFile(file, 1600, 0.85).then(function(result){
              return fetch('/api/product-images', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'upload',
                  product: 'alpha-run',
                  color: c.key,
                  imageBase64: result.base64,
                  contentType: result.contentType,
                  isHero: !hasImages
                })
              });
            }).then(function(r){ return r.json(); }).then(function(res){
              if (res && res.ok) {
                loadImages();
              } else {
                alert('Não foi possível enviar a foto.');
                uploadLabel.classList.remove('is-uploading');
                uploadText.textContent = '+ Enviar foto';
              }
            }).catch(function(){
              alert('Erro ao processar ou enviar a foto.');
              uploadLabel.classList.remove('is-uploading');
              uploadText.textContent = '+ Enviar foto';
            });
          });

          grid.appendChild(uploadLabel);
          wrap.appendChild(grid);
          container.appendChild(wrap);
        });
      }).catch(function(){
        container.innerHTML = '<p class="hint">Não foi possível carregar as fotos.</p>';
      });
    }

    loadImages();
  }

  function setupPasswordForm(){
    var form = document.getElementById('password-form');
    var successBox = document.getElementById('pwd-success');
    var errorBox = document.getElementById('pwd-error');

    form.addEventListener('submit', function(e){
      e.preventDefault();
      successBox.hidden = true;
      errorBox.hidden = true;

      var currentPassword = document.getElementById('current-password').value;
      var newPassword = document.getElementById('new-password').value;

      fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPassword, newPassword: newPassword })
      }).then(function(r){ return r.json().then(function(data){ return { status: r.status, data: data }; }); })
        .then(function(res){
          if (res.status === 200 && res.data.ok) {
            successBox.hidden = false;
            form.reset();
          } else {
            errorBox.textContent = res.data.message || 'Não foi possível alterar a senha.';
            errorBox.hidden = false;
          }
        }).catch(function(){
          errorBox.textContent = 'Erro de conexão.';
          errorBox.hidden = false;
        });
    });
  }
})();
