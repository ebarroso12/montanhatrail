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

/** Aceita o link de compartilhar do Spotify (com ?si=...) ou só o código; devolve o código ou ''. */
function spotifyPlaylistId(value) {
  const match = /^(?:https:\/\/open\.spotify\.com\/(?:intl-[a-z-]+\/)?playlist\/)?([A-Za-z0-9]{22})(?:[?#].*)?$/.exec(
    String(value || '').trim()
  );
  return match ? match[1] : '';
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
  // headerSymbol + wordmark: "A" e nome ALPINS metálicos, com bordas esfumadas
  // (WebP transparente), lado a lado no cabeçalho.
  // symbol: recorte quadrado do "A" (painel administrativo).
  // full: logo com nome e slogan, usada no rodapé.
  // Para trocar, substitua os arquivos mantendo os nomes (ou ajuste os caminhos aqui).
  logo: {
    headerSymbol: '/images/marca/alpins-simbolo-topo.webp',
    wordmark: '/images/marca/alpins-nome.webp',
    symbol: '/images/marca/alpins-simbolo.jpg',
    full: '/images/marca/alpins-logo-rodape.jpg',
    fullWidth: 640,
    fullHeight: 624,
  },
  // Google Search Console: cole aqui só o código do "content" da meta tag de
  // verificação (método "Tag HTML") e publique. Vazio = não adiciona a tag.
  googleSiteVerification: '',

  // Trilha sonora: botão flutuante que abre o player do Spotify. O player só é
  // carregado depois do clique (navegadores não deixam tocar som sozinho) e a
  // música continua enquanto a pessoa navega pelo site.
  // Para trocar a playlist, cole o link do Spotify (ou só o código) em spotifyPlaylist.
  // Vazio ou inválido = sem player (e o aviso de privacidade deixa de citá-lo).
  music: {
    label: 'Trilha sonora',
    title: 'Legendários o Propósito HAU!',
    spotifyPlaylist: 'https://open.spotify.com/playlist/4U6wx4BgB1NjmmXBJJD4Sa',
  },
  spotifyPlaylistId,
  /** Código da playlist configurada, ou '' se não houver uma válida (regra única para o botão e o aviso). */
  musicPlaylistId() {
    return spotifyPlaylistId(module.exports.music && module.exports.music.spotifyPlaylist);
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
