-- 005_filtros_e_limpeza.sql — Grupos da barra de filtros (Tipo / Para quem /
-- Estilo), categorias novas, marcação dos produtos atuais e limpeza dos
-- textos do site antigo. Pode rodar mais de uma vez. SQL simples (sem blocos
-- DO), para colar no SQL Editor sem quebrar.
-- Rodar no SQL Editor do Supabase ANTES do deploy desta versão.

BEGIN;

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS filter_group text NOT NULL DEFAULT 'tipo';

ALTER TABLE public.categories
  DROP CONSTRAINT IF EXISTS categories_filter_group_check;

ALTER TABLE public.categories
  ADD CONSTRAINT categories_filter_group_check
  CHECK (filter_group IN ('tipo', 'publico', 'estilo'));

INSERT INTO public.categories
  (name, slug, description, filter_group, active, sort_order)
VALUES
  ('Masculino', 'masculino', '', 'publico', true, 110),
  ('Feminino', 'feminino', '', 'publico', true, 120),
  ('Infantil', 'infantil', '', 'publico', true, 130),
  ('Casual', 'casual', '', 'estilo', true, 210),
  ('Esportivo', 'esportivo', '', 'estilo', true, 220),
  ('Luxo', 'luxo', '', 'estilo', true, 230),
  ('Dia a dia', 'dia-a-dia', '', 'estilo', true, 240)
ON CONFLICT (slug) DO NOTHING;

-- Marcação baseada nas descrições cadastradas.
INSERT INTO public.product_categories (product_id, category_id)
SELECT p.id, c.id
FROM public.products p
JOIN public.categories c ON (p.slug, c.slug) IN (
  ('tenis-adventure-trail', 'masculino'),
  ('tenis-adventure-trail', 'feminino'),
  ('tenis-adventure-trail', 'esportivo'),
  ('tenis-alpha-run', 'masculino'),
  ('tenis-alpha-run', 'feminino'),
  ('tenis-alpha-run', 'esportivo'),
  ('tenis-alpha-run', 'casual'),
  ('tenis-alpha-run', 'dia-a-dia'),
  ('sapatilha-aquatica-infantil', 'infantil'),
  ('sapatilha-aquatica-infantil', 'casual')
)
ON CONFLICT DO NOTHING;

-- Limpeza: textos antigos (links, preços e flags do site antigo).
-- Ficam só as chaves editáveis no painel (aba Conteúdo).
DELETE FROM public.site_content
WHERE key NOT IN (
  'hero_eyebrow', 'hero_title_line1', 'hero_title_line2',
  'hero_subtitle', 'promo_banner_enabled', 'promo_banner_text'
);

COMMIT;

-- Conferência. Esperado: 8 | 13 | 6 ou menos | 0 ou vazio.
-- tabela_antiga_bytes = 0 ou vazio: a tabela antiga de fotos está vazia
-- (ou já não existe) e pode ser removida com a 006.
SELECT
  (SELECT count(*) FROM public.categories) AS categorias,
  (SELECT count(*) FROM public.product_categories) AS marcacoes,
  (SELECT count(*) FROM public.site_content) AS textos,
  pg_relation_size(to_regclass('public.product_images'))
    AS tabela_antiga_bytes;
