-- 002_seed_alpins.sql — Migra os produtos atuais para o catálogo e limpa
-- os textos/links antigos do site. Rodar depois da 001. Pode ser executada
-- mais de uma vez sem duplicar nada (ON CONFLICT DO NOTHING).

BEGIN;

INSERT INTO public.categories (name, slug, description, active, sort_order)
VALUES ('Calçados', 'calcados', 'Tênis para trilha, caminhada e treino.', true, 10)
ON CONFLICT (slug) DO NOTHING;

-- Tênis Adventure Trail: mantém o link da Shopee que está em uso hoje
-- (valor salvo pelo painel antigo) e usa o novo link do Mercado Livre.
INSERT INTO public.products
  (name, slug, short_description, description, category_id, main_image_url, gallery_urls,
   shopee_url, mercadolivre_url, featured, active, sort_order)
SELECT
  'Tênis Adventure Trail',
  'tenis-adventure-trail',
  'Tênis Adventure para trilhas e caminhadas, com conforto e solado antiderrapante.',
  $txt$Um tênis Adventure para acompanhar o ritmo de trilhas e caminhadas — com conforto e solado antiderrapante para você seguir em frente.

Conforto — para manter o foco no caminho e na experiência de estar ao ar livre.
Solado antiderrapante — um atributo pensado para inspirar mais segurança ao caminhar.
Trilhas e caminhadas — para quem transforma tempo livre em percurso, natureza e descoberta.

Guia de tamanhos (comprimento do pé):
34 BR — 22,7 cm · 35 BR — 23,3 cm · 36 BR — 24,0 cm · 37 BR — 24,7 cm
38 BR — 25,3 cm · 39 BR — 26,0 cm · 40 BR — 26,7 cm · 41 BR — 27,3 cm
42 BR — 28,0 cm · 43 BR — 28,6 cm · 44 BR — 29,3 cm

Como medir: encoste o calcanhar na parede, com uma folha de papel sob o pé. Marque a ponta do dedo mais longo e meça a distância em centímetros. Repita no outro pé e use a maior medida.

Cores, acabamentos e numeração devem ser confirmados na página de compra.$txt$,
  c.id,
  '/images/hero-produto-cachoeira.jpg',
  ARRAY[
    '/images/produto-cachoeira-detalhe.jpg',
    '/images/produto-raizes.jpg',
    '/images/par-floresta-sola.jpg',
    '/images/par-floresta-detalhe.jpg'
  ],
  COALESCE(
    (SELECT NULLIF(value, '') FROM public.site_content WHERE key = 'shopee_url'),
    'https://shopee.com.br/product/1778701049/22499680145/'
  ),
  'https://meli.la/2LBg11T',
  true,
  true,
  10
FROM public.categories c
WHERE c.slug = 'calcados'
ON CONFLICT (slug) DO NOTHING;

-- Tênis Alpha Run: ainda sem links nem preço cadastrados (a página antiga
-- estava em "pré-lançamento"). Fica ativo sem botões de marketplace; o
-- visitante vê a opção de consultar pelo WhatsApp.
INSERT INTO public.products
  (name, slug, short_description, description, category_id, main_image_url, gallery_urls,
   featured, active, sort_order)
SELECT
  'Tênis Alpha Run',
  'tenis-alpha-run',
  'Tênis de treino com cabedal em malha respirável, entressola macia e solado de alta tração, em 4 cores.',
  $txt$Tênis de treino para academia, treino funcional e corrida curta.

Cabedal em malha respirável — tecido flexível que acompanha o movimento do pé e ventila no treino mais intenso.
Entressola macia — amortecimento pensado para séries longas e para o deslocamento curto entre estações.
Solado de alta tração — desenho antiderrapante para apoio firme em piso de academia, esteira e asfalto.
Modelagem unissex — numeração adulto.

Cores: Preto / Verde, Azul / Limão, Preto / Pink e Preto Total.

As cores devem ser confirmadas na página de compra.$txt$,
  c.id,
  '/images/alpha-run/verde/03.jpg',
  ARRAY[
    '/images/alpha-run/verde/04.jpg',
    '/images/alpha-run/verde/01.jpg',
    '/images/alpha-run/azul/01.jpg',
    '/images/alpha-run/azul/02.jpg',
    '/images/alpha-run/pink/01.jpg',
    '/images/alpha-run/pink/02.jpg',
    '/images/alpha-run/preto/01.jpg',
    '/images/alpha-run/preto/03.jpg'
  ],
  false,
  true,
  20
FROM public.categories c
WHERE c.slug = 'calcados'
ON CONFLICT (slug) DO NOTHING;

-- Textos do hero antigo (Adventure Trail) e link antigo do Mercado Livre:
-- esvazia só se ainda estiverem com os valores antigos. Campo vazio faz o
-- site usar os textos padrão da Alpins; nada editado depois é sobrescrito.
UPDATE public.site_content SET value = '', updated_at = now()
WHERE (key = 'hero_eyebrow'     AND value = 'Para quem escolhe o caminho')
   OR (key = 'hero_title_line1' AND value = 'Onde a terra chama,')
   OR (key = 'hero_title_line2' AND value = 'você vai.')
   OR (key = 'hero_subtitle'    AND value LIKE 'Um tênis Adventure para acompanhar%')
   OR (key = 'mercadolivre_url' AND value LIKE '%MLB-6522616368%');

COMMIT;
