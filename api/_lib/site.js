/**
 * Identidade da marca num lugar só: nome, contato, logo e textos padrão.
 * Qualquer componente que precise do telefone ou do link do WhatsApp lê daqui.
 */

const PHONE_E164 = '5516991271838';

function whatsappUrl(message) {
  const text = message || 'Olá! Vim pelo site da Alpins e gostaria de saber mais sobre os produtos.';
  return `https://wa.me/${PHONE_E164}?text=${encodeURIComponent(text)}`;
}

/** Public base URL used for canonical links, Open Graph and the sitemap. */
function siteUrl(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/+$/, '');
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  const host = String((req && req.headers.host) || 'localhost');
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  return `${local ? 'http' : 'https'}://${host}`;
}

module.exports = {
  name: 'Alpins',
  description:
    'Catálogo Alpins: produtos selecionados em diferentes categorias, com links diretos para a página de cada produto na Shopee e no Mercado Livre.',
  phone: {
    display: '(16) 99127-1838',
    tel: `+${PHONE_E164}`,
  },
  whatsappUrl,
  siteUrl,

  // Logomarca oficial (arte original: /images/marca/alpins-logo.jpg).
  // symbol: recorte do "A" usado no cabeçalho, ao lado do nome em texto.
  // full: logo com nome e slogan, usada no rodapé.
  // Para trocar, substitua os arquivos mantendo os nomes (ou ajuste os caminhos aqui).
  logo: {
    symbol: '/images/marca/alpins-simbolo.jpg',
    full: '/images/marca/alpins-logo-rodape.jpg',
    fullWidth: 640,
    fullHeight: 624,
  },
  // Imagem padrão ao compartilhar o site (WhatsApp, redes sociais).
  ogImage: '/images/marca/alpins-logo.jpg',

  heroImage: '/images/hero-produto-cachoeira.jpg',

  partner: {
    name: 'Selah',
    url: 'https://www.selaah.com.br/home',
    logo: '/images/parceiros/selah.png',
    tagline: 'Pause · Ore · Cresça',
    description: 'Um aplicativo para pausar, orar e crescer.',
  },

  developer: {
    name: 'Dr. Edson Barroso',
    instagram: { label: 'Instagram @dredsonbarroso', url: 'https://www.instagram.com/dredsonbarroso/' },
    website: { label: 'www.dredsonbarroso.com.br', url: 'https://www.dredsonbarroso.com.br/' },
    email: 'edson.barroso@gmail.com',
  },

  // Textos do topo da home. O painel (aba Conteúdo) pode sobrescrever cada um;
  // campo vazio no painel volta para o padrão abaixo.
  contentDefaults: {
    hero_eyebrow: 'Catálogo Alpins',
    hero_title_line1: 'Escolhas para',
    hero_title_line2: 'ir mais longe.',
    hero_subtitle:
      'Produtos selecionados e organizados por categoria, com links diretos para a página de cada um na Shopee e no Mercado Livre.',
  },
};
