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
    'footer-mercadolivre': 'Rodapé — Mercado Livre'
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
