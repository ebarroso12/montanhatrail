const site = require('../site');
const { esc, FONTS, FAVICON } = require('./layout');

function shell(title, bodyClass, body, script) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="robots" content="noindex, nofollow">
${FONTS}
<link rel="stylesheet" href="/css/style.css">
<link rel="stylesheet" href="/css/admin.css">
<link rel="icon" href="${FAVICON}">
</head>
<body class="admin-body ${bodyClass}">
${body}
<script src="/js/password-toggle.js" defer></script>
<script src="${script}" defer></script>
</body>
</html>`;
}

function login() {
  return shell(
    `Entrar — Painel ${site.name}`,
    'admin-login-page',
    `<main class="admin-login-wrap">
  <div class="admin-login-card">
    <img class="admin-login-symbol" src="/images/marca/alpins-simbolo.jpg" alt="" width="64" height="64">
    <p class="admin-login-brand">ALPINS</p>
    <h1>Painel <em>${esc(site.name)}</em></h1>
    <p class="sub">Acesso restrito à administração do catálogo.</p>

    <div class="admin-msg admin-msg-error" id="login-error" role="alert" hidden></div>

    <form id="login-form" autocomplete="on" novalidate>
      <div class="admin-field">
        <label for="email">E-mail</label>
        <input type="email" id="email" name="email" autocomplete="username" required>
      </div>
      <div class="admin-field">
        <label for="password">Senha</label>
        <input type="password" id="password" name="password" autocomplete="current-password" required>
      </div>
      <button type="submit" class="admin-btn admin-btn-primary admin-btn-block" id="login-submit">Entrar</button>
    </form>
    <p class="admin-login-foot"><a href="/">← Voltar ao site</a></p>
  </div>
</main>`,
    '/js/admin-login.js'
  );
}

const TABS = [
  ['painel', 'Painel'],
  ['produtos', 'Produtos'],
  ['categorias', 'Categorias'],
  ['leads', 'Leads'],
  ['cliques', 'Cliques'],
  ['conteudo', 'Conteúdo'],
  ['seguranca', 'Segurança'],
];

function dashboard() {
  const d = site.contentDefaults;
  const tabs = TABS.map(
    ([key, label], i) =>
      `<button class="admin-tab${i === 0 ? ' is-active' : ''}" type="button" role="tab" id="tab-${key}" data-tab="${key}" aria-controls="panel-${key}" aria-selected="${i === 0}">${label}</button>`
  ).join('');

  return shell(
    `Painel — ${site.name}`,
    'admin-dashboard',
    `<header class="admin-topbar">
  <a class="brand" href="/admin"><img src="/images/marca/alpins-simbolo.jpg" alt="" width="32" height="32">ALPINS <b>· painel</b></a>
  <div class="admin-topbar-right">
    <a href="/" target="_blank" rel="noopener noreferrer">Ver site ↗</a>
    <button class="admin-btn admin-btn-ghost" id="logout-btn" type="button">Sair</button>
  </div>
</header>

<main class="admin-main">
  <div class="admin-shell">
    <nav class="admin-tabs" role="tablist" aria-label="Seções do painel">${tabs}</nav>

    <!-- PAINEL -->
    <section class="admin-panel is-active" id="panel-painel" role="tabpanel" aria-labelledby="tab-painel">
      <div class="admin-card">
        <div class="admin-card-head">
          <div>
            <h2>Visão geral</h2>
            <p class="hint">Alterações aparecem no site em até 1 minuto.</p>
          </div>
          <div class="admin-actions">
            <button class="admin-btn admin-btn-primary" type="button" data-action="new-product">+ Novo produto</button>
            <button class="admin-btn admin-btn-outline" type="button" data-action="new-category">+ Nova categoria</button>
          </div>
        </div>
        <div class="admin-msg admin-msg-warn" id="storage-warning" hidden>
          O envio de imagens ainda não está configurado (variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY na Vercel). Enquanto isso, use URLs de imagens nos produtos.
        </div>
        <div class="admin-stat-row" id="stats"><p class="admin-loading">Carregando…</p></div>
      </div>
    </section>

    <!-- PRODUTOS -->
    <section class="admin-panel" id="panel-produtos" role="tabpanel" aria-labelledby="tab-produtos">
      <div class="admin-card">
        <div class="admin-card-head">
          <div>
            <h2>Produtos</h2>
            <p class="hint">Cada produto pode ter link da Shopee, do Mercado Livre, ambos ou nenhum.</p>
          </div>
          <button class="admin-btn admin-btn-primary" type="button" data-action="new-product">+ Novo produto</button>
        </div>
        <form class="admin-filters" id="product-filters" role="search">
          <label class="sr-only" for="filter-q">Buscar produtos</label>
          <input type="search" id="filter-q" name="q" placeholder="Buscar por nome ou slug" maxlength="80">
          <label class="sr-only" for="filter-category">Categoria</label>
          <select id="filter-category" name="categoryId"><option value="">Todas as categorias</option></select>
          <label class="sr-only" for="filter-status">Situação</label>
          <select id="filter-status" name="status">
            <option value="">Todas as situações</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
            <option value="featured">Em destaque</option>
          </select>
        </form>
        <div id="products-list" aria-live="polite"><p class="admin-loading">Carregando…</p></div>
        <div class="admin-pagination" id="products-pagination"></div>
      </div>
    </section>

    <!-- CATEGORIAS -->
    <section class="admin-panel" id="panel-categorias" role="tabpanel" aria-labelledby="tab-categorias">
      <div class="admin-card">
        <div class="admin-card-head">
          <div>
            <h2>Categorias</h2>
            <p class="hint">Use as setas para ordenar. Categorias inativas (e os produtos delas) somem do site, mas nada é apagado.</p>
          </div>
          <button class="admin-btn admin-btn-primary" type="button" data-action="new-category">+ Nova categoria</button>
        </div>
        <div id="categories-list" aria-live="polite"><p class="admin-loading">Carregando…</p></div>
      </div>
    </section>

    <!-- LEADS -->
    <section class="admin-panel" id="panel-leads" role="tabpanel" aria-labelledby="tab-leads">
      <div class="admin-card">
        <h2>Leads capturados</h2>
        <p class="hint">Pessoas que deixaram o e-mail no formulário "Seja um alpinista" do site.</p>
        <div id="leads-content"><p class="admin-loading">Carregando…</p></div>
      </div>
    </section>

    <!-- CLIQUES -->
    <section class="admin-panel" id="panel-cliques" role="tabpanel" aria-labelledby="tab-cliques">
      <div class="admin-card">
        <h2>Cliques nos botões de compra</h2>
        <p class="hint">Cliques por produto e marketplace, no total e nos últimos 7 dias.</p>
        <div id="clicks-content"><p class="admin-loading">Carregando…</p></div>
      </div>
    </section>

    <!-- CONTEÚDO -->
    <section class="admin-panel" id="panel-conteudo" role="tabpanel" aria-labelledby="tab-conteudo">
      <div class="admin-card">
        <h2>Textos do topo da home</h2>
        <p class="hint">Deixe um campo vazio para usar o texto padrão (mostrado em cinza).</p>

        <div class="admin-msg admin-msg-success" id="content-success" role="status" hidden>Salvo com sucesso.</div>
        <div class="admin-msg admin-msg-error" id="content-error" role="alert" hidden></div>

        <form id="content-form" novalidate>
          <div class="admin-field">
            <label for="hero_eyebrow">Selo acima do título</label>
            <input type="text" id="hero_eyebrow" name="hero_eyebrow" maxlength="120" placeholder="${esc(d.hero_eyebrow)}">
          </div>
          <div class="admin-grid-2">
            <div class="admin-field">
              <label for="hero_title_line1">Título — primeira linha</label>
              <input type="text" id="hero_title_line1" name="hero_title_line1" maxlength="80" placeholder="${esc(d.hero_title_line1)}">
            </div>
            <div class="admin-field">
              <label for="hero_title_line2">Título — segunda linha (itálico)</label>
              <input type="text" id="hero_title_line2" name="hero_title_line2" maxlength="80" placeholder="${esc(d.hero_title_line2)}">
            </div>
          </div>
          <div class="admin-field">
            <label for="hero_subtitle">Subtítulo</label>
            <textarea id="hero_subtitle" name="hero_subtitle" rows="3" maxlength="300" placeholder="${esc(d.hero_subtitle)}"></textarea>
          </div>
          <div class="admin-field checkbox">
            <input type="checkbox" id="promo_banner_enabled" name="promo_banner_enabled">
            <label for="promo_banner_enabled">Mostrar faixa de promoção no topo do site</label>
          </div>
          <div class="admin-field">
            <label for="promo_banner_text">Texto da faixa de promoção</label>
            <input type="text" id="promo_banner_text" name="promo_banner_text" maxlength="200" placeholder="Ex.: Novos produtos toda semana">
          </div>
          <div class="admin-form-actions">
            <button type="submit" class="admin-btn admin-btn-primary">Salvar alterações</button>
          </div>
        </form>
      </div>
    </section>

    <!-- SEGURANÇA -->
    <section class="admin-panel" id="panel-seguranca" role="tabpanel" aria-labelledby="tab-seguranca">
      <div class="admin-card">
        <h2>Alterar senha</h2>
        <p class="hint">Use uma senha longa e exclusiva deste painel.</p>

        <div class="admin-msg admin-msg-success" id="pwd-success" role="status" hidden>Senha alterada com sucesso.</div>
        <div class="admin-msg admin-msg-error" id="pwd-error" role="alert" hidden></div>

        <form id="password-form" novalidate>
          <div class="admin-field">
            <label for="current-password">Senha atual</label>
            <input type="password" id="current-password" autocomplete="current-password" required>
          </div>
          <div class="admin-field">
            <label for="new-password">Nova senha (mín. 8 caracteres)</label>
            <input type="password" id="new-password" autocomplete="new-password" minlength="8" required>
          </div>
          <div class="admin-form-actions">
            <button type="submit" class="admin-btn admin-btn-primary">Alterar senha</button>
          </div>
        </form>
      </div>
    </section>
  </div>
</main>

<!-- EDITOR DE PRODUTO -->
<dialog class="admin-dialog" id="product-dialog" aria-labelledby="product-dialog-title">
  <form id="product-form" novalidate>
    <div class="admin-dialog-head">
      <h2 id="product-dialog-title">Novo produto</h2>
      <button type="button" class="admin-icon-btn" data-close aria-label="Fechar">✕</button>
    </div>
    <div class="admin-dialog-body">
      <div class="admin-msg admin-msg-error" id="product-error" role="alert" hidden></div>

      <div class="admin-grid-2">
        <div class="admin-field">
          <label for="p-name">Nome *</label>
          <input type="text" id="p-name" name="name" maxlength="120" required>
        </div>
        <div class="admin-field">
          <label for="p-slug">Slug (endereço)</label>
          <input type="text" id="p-slug" name="slug" maxlength="80" placeholder="gerado a partir do nome" autocomplete="off" spellcheck="false">
          <p class="field-hint">/produto/<span id="p-slug-preview">…</span></p>
        </div>
      </div>

      <div class="admin-field">
        <label for="p-category">Categoria principal *</label>
        <select id="p-category" name="categoryId" required></select>
        <p class="field-hint">Aparece no card e no caminho da página do produto.</p>
      </div>

      <fieldset class="admin-fieldset">
        <legend>Também aparece em (opcional)</legend>
        <div class="admin-checks" id="p-categories"></div>
        <p class="field-hint">Marque outras categorias em que o produto deve aparecer. Ex.: um tênis unissex em "Tênis Masculino" e "Tênis Feminino".</p>
      </fieldset>

      <div class="admin-field">
        <label for="p-short">Descrição curta *</label>
        <textarea id="p-short" name="shortDescription" rows="2" maxlength="300" required></textarea>
        <p class="field-hint">Aparece na página do produto e nos resultados do Google. Até 300 caracteres.</p>
      </div>

      <div class="admin-field">
        <label for="p-description">Descrição completa (opcional)</label>
        <textarea id="p-description" name="description" rows="7" maxlength="5000"></textarea>
        <p class="field-hint">Linha em branco separa parágrafos.</p>
      </div>

      <fieldset class="admin-fieldset">
        <legend>Imagens</legend>
        <div class="admin-field">
          <span class="admin-label" id="p-main-label">Imagem principal</span>
          <div class="admin-image-main">
            <div class="admin-image-preview" id="p-main-preview"></div>
            <div class="admin-image-controls">
              <label class="admin-btn admin-btn-outline admin-upload-btn" data-upload>
                <span>Enviar imagem</span>
                <input type="file" id="p-main-file" accept="image/jpeg,image/png,image/webp" class="sr-only">
              </label>
              <input type="text" id="p-main-image" name="mainImageUrl" maxlength="1000" placeholder="ou cole a URL da imagem (https://…)" aria-labelledby="p-main-label" spellcheck="false">
              <button type="button" class="admin-btn-link" id="p-main-clear">Remover imagem principal</button>
            </div>
          </div>
        </div>
        <div class="admin-field">
          <span class="admin-label">Galeria (opcional, até 12 imagens)</span>
          <div class="admin-gallery" id="p-gallery"></div>
          <div class="admin-gallery-add">
            <label class="admin-btn admin-btn-outline admin-upload-btn" data-upload>
              <span>Adicionar imagens</span>
              <input type="file" id="p-gallery-files" accept="image/jpeg,image/png,image/webp" multiple class="sr-only">
            </label>
            <input type="text" id="p-gallery-url" maxlength="1000" placeholder="ou cole a URL de uma imagem" aria-label="URL de imagem para a galeria" spellcheck="false">
            <button type="button" class="admin-btn admin-btn-outline" id="p-gallery-add-url">Adicionar URL</button>
          </div>
        </div>
      </fieldset>

      <fieldset class="admin-fieldset">
        <legend>Preço (opcional)</legend>
        <div class="admin-grid-2">
          <div class="admin-field">
            <label for="p-price">Preço (R$)</label>
            <input type="text" id="p-price" name="price" inputmode="decimal" placeholder="Ex.: 199,90" maxlength="14">
          </div>
          <div class="admin-field">
            <label for="p-sale-price">Preço promocional (R$)</label>
            <input type="text" id="p-sale-price" name="salePrice" inputmode="decimal" placeholder="Ex.: 159,90" maxlength="14">
          </div>
        </div>
        <p class="field-hint">Sem preço, o card não mostra valor. O preço promocional precisa ser menor que o normal e ativa o selo de promoção.</p>
      </fieldset>

      <fieldset class="admin-fieldset">
        <legend>Links de compra</legend>
        <div class="admin-field">
          <label for="p-shopee">Link da Shopee</label>
          <div class="admin-input-action">
            <input type="url" id="p-shopee" name="shopeeUrl" maxlength="1000" placeholder="https://s.shopee.com.br/…" spellcheck="false">
            <a class="admin-btn admin-btn-outline" id="p-shopee-test" target="_blank" rel="noopener noreferrer" hidden>Testar ↗</a>
          </div>
        </div>
        <div class="admin-field">
          <label for="p-mercadolivre">Link do Mercado Livre</label>
          <div class="admin-input-action">
            <input type="url" id="p-mercadolivre" name="mercadolivreUrl" maxlength="1000" placeholder="https://meli.la/…" spellcheck="false">
            <a class="admin-btn admin-btn-outline" id="p-mercadolivre-test" target="_blank" rel="noopener noreferrer" hidden>Testar ↗</a>
          </div>
        </div>
        <p class="field-hint">Preencha um, os dois ou nenhum. Aceita apenas endereços https da Shopee (shopee.com.br, shope.ee, shp.ee) e do Mercado Livre (mercadolivre.com.br, mercadolivre.com, meli.la).</p>
      </fieldset>

      <fieldset class="admin-fieldset">
        <legend>Publicação</legend>
        <div class="admin-grid-3">
          <div class="admin-field checkbox">
            <input type="checkbox" id="p-active" name="active">
            <label for="p-active">Ativo (visível no site)</label>
          </div>
          <div class="admin-field checkbox">
            <input type="checkbox" id="p-featured" name="featured">
            <label for="p-featured">Em destaque na home</label>
          </div>
          <div class="admin-field">
            <label for="p-order">Ordem de exibição</label>
            <input type="number" id="p-order" name="sortOrder" step="1" min="-100000" max="100000" value="0">
          </div>
        </div>
        <p class="field-hint">Produtos novos começam inativos: salve, use "Salvar e visualizar" para conferir e ative quando estiver pronto. Ordem menor aparece primeiro.</p>
      </fieldset>
    </div>
    <div class="admin-dialog-foot">
      <button type="button" class="admin-btn admin-btn-outline" data-close>Cancelar</button>
      <button type="button" class="admin-btn admin-btn-outline" id="product-save-preview">Salvar e visualizar</button>
      <button type="submit" class="admin-btn admin-btn-primary" id="product-save">Salvar</button>
    </div>
  </form>
</dialog>

<!-- EDITOR DE CATEGORIA -->
<dialog class="admin-dialog admin-dialog-sm" id="category-dialog" aria-labelledby="category-dialog-title">
  <form id="category-form" novalidate>
    <div class="admin-dialog-head">
      <h2 id="category-dialog-title">Nova categoria</h2>
      <button type="button" class="admin-icon-btn" data-close aria-label="Fechar">✕</button>
    </div>
    <div class="admin-dialog-body">
      <div class="admin-msg admin-msg-error" id="category-error" role="alert" hidden></div>
      <div class="admin-field">
        <label for="c-name">Nome *</label>
        <input type="text" id="c-name" name="name" maxlength="80" required>
      </div>
      <div class="admin-field">
        <label for="c-slug">Slug (endereço)</label>
        <input type="text" id="c-slug" name="slug" maxlength="80" placeholder="gerado a partir do nome" autocomplete="off" spellcheck="false">
        <p class="field-hint">/categoria/<span id="c-slug-preview">…</span></p>
      </div>
      <div class="admin-field">
        <label for="c-description">Descrição (opcional)</label>
        <textarea id="c-description" name="description" rows="2" maxlength="300"></textarea>
      </div>
      <div class="admin-grid-2">
        <div class="admin-field checkbox">
          <input type="checkbox" id="c-active" name="active" checked>
          <label for="c-active">Ativa</label>
        </div>
        <div class="admin-field">
          <label for="c-order">Ordem</label>
          <input type="number" id="c-order" name="sortOrder" step="1" min="-100000" max="100000" value="0">
        </div>
      </div>
    </div>
    <div class="admin-dialog-foot">
      <button type="button" class="admin-btn admin-btn-outline" data-close>Cancelar</button>
      <button type="submit" class="admin-btn admin-btn-primary">Salvar</button>
    </div>
  </form>
</dialog>

<!-- CONFIRMAÇÃO -->
<dialog class="admin-dialog admin-dialog-sm" id="confirm-dialog" aria-labelledby="confirm-title">
  <form id="confirm-form" novalidate>
    <div class="admin-dialog-head">
      <h2 id="confirm-title">Confirmar exclusão</h2>
    </div>
    <div class="admin-dialog-body">
      <p id="confirm-message"></p>
      <div class="admin-field" id="confirm-type-wrap" hidden>
        <label for="confirm-type" id="confirm-type-label"></label>
        <input type="text" id="confirm-type" autocomplete="off" spellcheck="false">
      </div>
      <div class="admin-msg admin-msg-error" id="confirm-error" role="alert" hidden></div>
    </div>
    <div class="admin-dialog-foot">
      <button type="button" class="admin-btn admin-btn-outline" data-close>Cancelar</button>
      <button type="submit" class="admin-btn admin-btn-danger" id="confirm-ok">Excluir</button>
    </div>
  </form>
</dialog>

<div class="admin-toast" id="toast" role="status" aria-live="polite" hidden></div>`,
    '/js/admin.js'
  );
}

module.exports = { login, dashboard };
