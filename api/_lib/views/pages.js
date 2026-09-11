const site = require('../site');
const { esc, layout, absoluteUrl, truncate } = require('./layout');
const c = require('./components');

const TICKER_ITEMS = [
  'Catálogo Alpins',
  'Produtos selecionados',
  'Compra na Shopee',
  'Compra no Mercado Livre',
  'Atendimento pelo WhatsApp',
];

function ticker() {
  const items = TICKER_ITEMS.concat(TICKER_ITEMS)
    .map((item) => `<span>${esc(item)}</span><span>·</span>`)
    .join('');
  return `<div class="ticker" aria-hidden="true"><div class="ticker-track">${items}</div></div>`;
}

function unavailableNotice() {
  return c.emptyState(
    'Catálogo temporariamente indisponível',
    'Não conseguimos carregar os produtos agora. Tente novamente em instantes ou fale com a gente pelo WhatsApp.',
    `<a class="btn btn-whatsapp btn-sm" href="${esc(site.whatsappUrl())}" target="_blank" rel="noopener noreferrer">Falar no WhatsApp ↗</a>`
  );
}

function leadSection() {
  return `<section class="section section-cream" id="novidades">
  <div class="wrap two-col align-start">
    <div class="col-content">
      <p class="eyebrow"><span class="rule"></span>Clube dos alpinistas</p>
      <h2>Seja um <em>alpinista</em><br>da Alpins.</h2>
      <p class="body-text">Deixe seu e-mail para receber novidades, lançamentos e ofertas do catálogo. Sem spam — só o essencial.</p>
    </div>
    <div class="size-card">
      <p class="eyebrow"><span class="rule"></span>Avise-me</p>
      <h3>Receber novidades</h3>

      <div class="admin-msg admin-msg-success" id="lead-success" role="status" hidden>Pronto, alpinista! Você vai receber nossas novidades em breve.</div>
      <div class="admin-msg admin-msg-error" id="lead-error" role="alert" hidden></div>

      <form id="lead-form" novalidate>
        <label class="field-label" for="lead-name">Seu nome de alpinista (opcional)</label>
        <div class="field-row"><input type="text" id="lead-name" name="name" autocomplete="name" maxlength="200"></div>

        <label class="field-label" for="lead-email">E-mail</label>
        <div class="field-row"><input type="email" id="lead-email" name="email" autocomplete="email" maxlength="200" required></div>

        <!-- honeypot: hidden from real people, only bots tend to fill this in -->
        <div class="hp-field" aria-hidden="true">
          <label for="lead-website">Não preencha este campo</label>
          <input type="text" id="lead-website" name="website" tabindex="-1" autocomplete="off">
        </div>

        <label class="consent" for="lead-consent">
          <input type="checkbox" id="lead-consent" name="consent" required>
          <span>Quero receber novidades da Alpins por e-mail e concordo com o <a href="/privacidade">aviso de privacidade</a>. Posso pedir a remoção dos meus dados quando quiser.</span>
        </label>

        <button type="submit" class="btn btn-dark btn-block" id="lead-submit">Quero ser alpinista</button>
      </form>
    </div>
  </div>
</section>`;
}

function contactSection() {
  return `<section class="section cta-banner" id="contato" style="--bg:url('/images/par-floresta-sola.jpg')">
  <div class="hero-scrim"></div>
  <div class="wrap">
    <p class="eyebrow eyebrow-light"><span class="rule"></span>Contato</p>
    <h2 class="light">Ficou com dúvida?<br><em>Fale com a Alpins.</em></h2>
    <p class="body-text light-soft">Atendimento pelo WhatsApp ${esc(site.phone.display)}.</p>
    <div class="cta-row">
      <a class="btn btn-whatsapp" href="${esc(site.whatsappUrl())}" target="_blank" rel="noopener noreferrer">Chamar no WhatsApp ↗</a>
      <a class="btn btn-outline-light" href="tel:${esc(site.phone.tel)}">Ligar ${esc(site.phone.display)}</a>
    </div>
  </div>
</section>`;
}

function home(ctx, data) {
  const content = ctx.content;
  const { featured, latest } = data;
  const failed = !!ctx.catalogError;

  const hero = `<section class="hero" style="--bg:url('${esc(site.heroImage)}')">
  <div class="hero-scrim"></div>
  <div class="wrap hero-inner">
    <p class="eyebrow eyebrow-light"><span class="rule"></span>${esc(content.hero_eyebrow)}</p>
    <h1>${esc(content.hero_title_line1)}<br><em>${esc(content.hero_title_line2)}</em></h1>
    <p class="lead">${esc(content.hero_subtitle)}</p>
    <div class="cta-row">
      <a class="btn btn-primary" href="#catalogo">Ver produtos</a>
      <a class="btn btn-outline-light" href="${esc(site.whatsappUrl())}" target="_blank" rel="noopener noreferrer">Falar no WhatsApp ↗</a>
    </div>
  </div>
</section>`;

  const categories = failed
    ? ''
    : `<section class="section section-cream" id="categorias">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow"><span class="rule"></span>01 · Categorias</p>
      <h2>Encontre pelo <em>que você procura.</em></h2>
    </div>
    ${
      ctx.categories.length
        ? c.categoryCards(ctx.categories)
        : c.emptyState('Categorias em breve', 'As categorias aparecem aqui assim que os primeiros produtos forem publicados.')
    }
  </div>
</section>`;

  const highlights = featured.length
    ? `<section class="section section-dark" id="destaques">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow eyebrow-light"><span class="rule"></span>02 · Destaques</p>
      <h2 class="light">Selecionados <em>pela Alpins.</em></h2>
    </div>
    ${c.productGrid(featured)}
  </div>
</section>`
    : '';

  let catalogBody;
  if (failed) catalogBody = unavailableNotice();
  else if (!latest.items.length) {
    catalogBody = c.emptyState('Novos produtos em breve', 'Estamos preparando o catálogo. Enquanto isso, fale com a gente pelo WhatsApp.');
  } else {
    catalogBody = `${c.categoryChips(ctx.categories, '')}
    ${c.productGrid(latest.items)}
    ${
      latest.total > latest.items.length
        ? `<div class="section-foot"><a class="btn btn-outline-dark" href="/catalogo">Ver catálogo completo (${latest.total} produtos)</a></div>`
        : ''
    }`;
  }

  const catalog = `<section class="section section-sand" id="catalogo">
  <div class="wrap">
    <div class="section-head section-head-split">
      <div>
        <p class="eyebrow"><span class="rule"></span>03 · Catálogo</p>
        <h2>Todos os <em>produtos.</em></h2>
      </div>
      ${failed ? '' : c.searchForm('')}
    </div>
    ${catalogBody}
  </div>
</section>`;

  const benefits = `<section class="section section-dark" id="por-que">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow eyebrow-light"><span class="rule"></span>04 · Por que a Alpins</p>
      <h2 class="light">Simples de encontrar.<br><em>Direto para comprar.</em></h2>
    </div>
    <ul class="benefit-grid">
      <li>
        <span class="benefit-icon" aria-hidden="true">🧭</span>
        <h3 class="light">Seleção organizada</h3>
        <p class="light-soft">Produtos separados por categoria para você encontrar o que precisa sem perder tempo.</p>
      </li>
      <li>
        <span class="benefit-icon" aria-hidden="true">🛒</span>
        <h3 class="light">Compra no marketplace</h3>
        <p class="light-soft">Você finaliza a compra na Shopee ou no Mercado Livre, com as condições de cada plataforma.</p>
      </li>
      <li>
        <span class="benefit-icon" aria-hidden="true">💬</span>
        <h3 class="light">Atendimento pelo WhatsApp</h3>
        <p class="light-soft">Ficou com dúvida sobre algum produto? Fale com a Alpins pelo ${esc(site.phone.display)}.</p>
      </li>
    </ul>
  </div>
</section>`;

  return layout({
    ctx,
    path: '/',
    description: site.description,
    bodyClass: 'page-home',
    content: [hero, ticker(), categories, highlights, catalog, benefits, leadSection(), contactSection()].join('\n'),
  });
}

function pageHead(opts) {
  return `<section class="page-head section-dark${opts.compact ? ' page-head-compact' : ''}">
  <div class="wrap">
    ${opts.breadcrumb || ''}
    ${opts.eyebrow ? `<p class="eyebrow eyebrow-light"><span class="rule"></span>${opts.eyebrow}</p>` : ''}
    ${opts.heading ? `<h1 class="light">${opts.heading}</h1>` : ''}
    ${opts.intro ? `<p class="body-text light-soft">${opts.intro}</p>` : ''}
  </div>
</section>`;
}

function breadcrumb(items) {
  const parts = items.map((item, i) =>
    i === items.length - 1
      ? `<span aria-current="page">${esc(item.label)}</span>`
      : `<a href="${esc(item.href)}">${esc(item.label)}</a>`
  );
  return `<nav class="breadcrumb" aria-label="Você está em">${parts.join('<span aria-hidden="true">/</span>')}</nav>`;
}

/** /catalogo (with optional search) and /categoria/:slug. */
function listing(ctx, data) {
  const { category, search, page, pageSize, result } = data;
  const totalPages = Math.max(1, Math.ceil(result.total / pageSize));
  const basePath = category ? `/categoria/${category.slug}` : '/catalogo';
  const params = search ? { q: search } : {};

  let heading;
  let intro;
  if (category) {
    heading = esc(category.name);
    intro = category.description ? esc(category.description) : '';
  } else if (search) {
    heading = `Resultados para <em>“${esc(search)}”</em>`;
    intro = `${result.total} ${result.total === 1 ? 'produto encontrado' : 'produtos encontrados'}.`;
  } else {
    heading = 'Catálogo <em>completo.</em>';
    intro = 'Todos os produtos da Alpins, organizados por categoria.';
  }

  let body;
  if (result.items.length) {
    body = `${c.productGrid(result.items)}${c.pagination(basePath, page, totalPages, params)}`;
  } else if (search) {
    body = c.emptyState(
      'Nenhum produto encontrado',
      `Não encontramos produtos para “${esc(search)}”. Tente outra palavra ou veja o catálogo completo.`,
      '<a class="btn btn-dark btn-sm" href="/catalogo">Ver todos os produtos</a>'
    );
  } else if (page > 1) {
    body = c.emptyState('Página vazia', 'Esta página não tem produtos.', `<a class="btn btn-dark btn-sm" href="${esc(basePath)}">Voltar para a primeira página</a>`);
  } else {
    body = c.emptyState(
      category ? 'Ainda não há produtos nesta categoria' : 'Novos produtos em breve',
      'Volte em breve ou fale com a gente pelo WhatsApp.',
      '<a class="btn btn-dark btn-sm" href="/catalogo">Ver catálogo</a>'
    );
  }

  const crumbs = [{ label: 'Início', href: '/' }];
  if (category) crumbs.push({ label: 'Catálogo', href: '/catalogo' }, { label: category.name });
  else crumbs.push({ label: 'Catálogo' });

  const content = `${pageHead({
    breadcrumb: breadcrumb(crumbs),
    eyebrow: category ? 'Categoria' : 'Catálogo Alpins',
    heading,
    intro,
  })}
<section class="section section-sand section-tight">
  <div class="wrap">
    <div class="listing-toolbar">
      ${c.categoryChips(ctx.categories, category ? category.slug : '')}
      ${c.searchForm(search)}
    </div>
    ${body}
  </div>
</section>`;

  const pageSuffix = page > 1 ? ` — página ${page}` : '';
  return layout({
    ctx,
    title: category ? `${category.name}${pageSuffix}` : search ? `Busca: ${search}` : `Catálogo${pageSuffix}`,
    description: category
      ? category.description || `Produtos da categoria ${category.name} no catálogo Alpins.`
      : 'Catálogo completo da Alpins, com links diretos para a Shopee e o Mercado Livre.',
    path: basePath + (page > 1 ? `?pagina=${page}` : ''),
    // Busca e listagens vazias (categoria sem produtos, página além do fim) ficam fora do Google.
    noindex: !!search || !result.items.length,
    bodyClass: 'page-listing',
    content,
  });
}

function product(ctx, data) {
  const p = data.product;
  const related = data.related;
  const images = [p.mainImageUrl].concat(p.galleryUrls).filter(Boolean);
  const otherCategories = p.categories.filter((cat) => cat.active && cat.id !== p.categoryId);
  const path = `/produto/${p.slug}`;
  const whatsapp = site.whatsappUrl(
    `Olá! Tenho interesse no produto "${p.name}" que vi no site da Alpins: ${absoluteUrl(ctx.base, path)}`
  );

  const gallery = images.length
    ? `<button type="button" class="product-gallery-main" data-lightbox aria-label="Ampliar imagem de ${esc(p.name)}">
        <img id="gallery-main" src="${esc(images[0])}" alt="${esc(p.name)}" decoding="async" fetchpriority="high">
      </button>
      ${
        images.length > 1
          ? `<div class="product-thumbs" role="group" aria-label="Imagens do produto">${images
              .map(
                (src, i) =>
                  `<button type="button" class="product-thumb${i === 0 ? ' is-active' : ''}" data-gallery-src="${esc(src)}" aria-label="Mostrar imagem ${i + 1} de ${images.length}" aria-pressed="${i === 0}"><img src="${esc(src)}" alt="" loading="lazy" decoding="async"></button>`
              )
              .join('')}</div>`
          : ''
      }`
    : `<div class="product-gallery-main is-empty">${c.PLACEHOLDER}</div>`;

  const previewBanner = data.preview
    ? `<div class="preview-banner" role="status"><div class="wrap"><strong>Pré-visualização.</strong> ${
        !p.active ? 'Este produto está inativo' : 'A categoria deste produto está inativa'
      } e não aparece para os visitantes. <a href="/admin#produtos">Voltar ao painel</a></div></div>`
    : '';

  const content = `${pageHead({
    compact: true,
    breadcrumb: breadcrumb([
      { label: 'Início', href: '/' },
      { label: p.category.name, href: `/categoria/${p.category.slug}` },
      { label: p.name },
    ]),
  })}
${previewBanner}
<section class="section section-cream product-section">
  <div class="wrap product-layout">
    <div class="product-gallery">
      ${gallery}
    </div>
    <div class="product-info">
      <a class="product-category" href="/categoria/${esc(p.category.slug)}">${esc(p.category.name)}</a>
      <h1 class="product-title">${esc(p.name)}</h1>
      ${
        otherCategories.length
          ? `<p class="product-cats">Também em: ${otherCategories
              .map((cat) => `<a href="/categoria/${esc(cat.slug)}">${esc(cat.name)}</a>`)
              .join(' · ')}</p>`
          : ''
      }
      ${p.onSale ? `<span class="badge badge-sale badge-static">Promoção −${p.discountPercent}%</span>` : ''}
      ${c.price(p, 'lg')}
      ${p.shortDescription ? `<p class="product-lead">${esc(p.shortDescription)}</p>` : ''}
      ${
        p.links.length
          ? `<p class="market-hint">Escolha onde comprar:</p>${c.marketplaceButtons(p, 'produto')}`
          : '<p class="market-hint">Os links de compra deste produto ainda não estão disponíveis. Fale com a gente para saber mais.</p>'
      }
      <a class="btn btn-whatsapp btn-block" href="${esc(whatsapp)}" target="_blank" rel="noopener noreferrer">${
        p.links.length ? 'Tirar dúvidas no WhatsApp' : 'Consultar pelo WhatsApp'
      } ↗</a>
      <p class="fine-print">Preço, estoque, frete e condições são definidos pelo marketplace e podem mudar. Confira sempre na página de compra.</p>
    </div>
  </div>
  ${
    p.description
      ? `<div class="wrap"><div class="product-description"><h2>Sobre o <em>produto.</em></h2><div class="rich-text">${c.richText(p.description)}</div></div></div>`
      : ''
  }
</section>
${
  related.length
    ? `<section class="section section-sand">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow"><span class="rule"></span>${esc(p.category.name)}</p>
      <h2>Você também pode <em>gostar.</em></h2>
    </div>
    ${c.productGrid(related)}
  </div>
</section>`
    : ''
}`;

  return layout({
    ctx,
    title: p.name,
    description: p.shortDescription || truncate(p.description, 160),
    path,
    image: p.mainImageUrl,
    ogType: 'product',
    noindex: !!data.preview,
    bodyClass: 'page-product',
    content,
  });
}

function notFound(ctx) {
  return layout({
    ctx,
    title: 'Página não encontrada',
    description: 'A página procurada não existe ou o produto não está mais disponível.',
    noindex: true,
    bodyClass: 'page-error',
    content: pageHead({
      eyebrow: 'Erro 404',
      heading: 'Esta trilha <em>não leva a lugar nenhum.</em>',
      intro: 'A página que você procurou não existe ou o produto não está mais disponível.',
    }).replace(
      '</div>\n</section>',
      `<div class="cta-row"><a class="btn btn-primary" href="/catalogo">Ver catálogo</a><a class="btn btn-outline-light" href="/">Voltar ao início</a></div>
  </div>
</section>`
    ),
  });
}

function unavailable(ctx) {
  return layout({
    ctx,
    title: 'Catálogo indisponível',
    noindex: true,
    bodyClass: 'page-error',
    content: `${pageHead({ eyebrow: 'Instabilidade', heading: 'Voltamos <em>em instantes.</em>' })}
<section class="section section-cream section-tight"><div class="wrap">${unavailableNotice()}</div></section>`,
  });
}

function privacy(ctx) {
  const phone = esc(site.phone.display);
  const whatsapp = `<a href="${esc(site.whatsappUrl('Olá! Quero falar sobre os meus dados cadastrados no site da Alpins.'))}" target="_blank" rel="noopener noreferrer">WhatsApp ${phone}</a>`;
  return layout({
    ctx,
    title: 'Aviso de privacidade',
    description: 'Como a Alpins trata os dados de quem visita o site e se cadastra para receber novidades.',
    path: '/privacidade',
    bodyClass: 'page-legal',
    content: `${pageHead({
      breadcrumb: breadcrumb([{ label: 'Início', href: '/' }, { label: 'Aviso de privacidade' }]),
      eyebrow: 'Transparência',
      heading: 'Aviso de <em>privacidade.</em>',
      intro: 'Última atualização: 11 de setembro de 2026.',
    })}
<section class="section section-cream section-tight">
  <div class="wrap legal-page">
    <h2>Quem somos</h2>
    <p>A ${esc(site.name)} é um catálogo de produtos. Para falar sobre privacidade e sobre os seus dados, use o ${whatsapp}.</p>

    <h2>Quais dados coletamos</h2>
    <ul>
      <li><strong>Formulário "Seja um alpinista":</strong> nome (opcional) e e-mail, com a data do cadastro.</li>
      <li><strong>Cliques nos botões de compra:</strong> qual produto e qual marketplace foram clicados e em qual página, sem nome, e-mail ou outro dado que identifique você.</li>
      <li><strong>Cookies:</strong> o site não usa cookies de rastreamento nem de publicidade. O único cookie é o de login da área administrativa.</li>
    </ul>

    <h2>Para que usamos</h2>
    <ul>
      <li>Enviar novidades, lançamentos e ofertas do catálogo para quem se cadastrou e deu consentimento.</li>
      <li>Entender quais produtos despertam mais interesse, por meio da contagem de cliques.</li>
    </ul>

    <h2>Compras</h2>
    <p>A compra, o pagamento e a entrega acontecem na Shopee ou no Mercado Livre. Os dados informados nesses sites seguem a política de privacidade de cada marketplace.</p>

    <h2>Onde os dados ficam</h2>
    <p>Os dados ficam armazenados nos provedores que hospedam o site (Vercel e Supabase). As fontes de texto do site são carregadas do Google Fonts.</p>

    <h2>Por quanto tempo</h2>
    <p>Os dados do cadastro ficam guardados até você pedir a remoção.</p>

    <h2>Seus direitos</h2>
    <p>Você pode pedir acesso, correção ou exclusão dos seus dados, ou deixar de receber novidades, a qualquer momento, pelo ${whatsapp}.</p>
  </div>
</section>`,
  });
}

module.exports = { home, listing, product, notFound, unavailable, privacy };
