-- 001_catalog.sql — Catálogo Alpins: categorias e produtos.
--
-- Migration ADITIVA: não remove nem altera dados existentes.
-- Rodar uma única vez no SQL Editor do Supabase. Tudo roda numa transação:
-- se as tabelas já existirem, a migration falha inteira e nada é aplicado.

BEGIN;

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.categories (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  slug        text NOT NULL UNIQUE CHECK (char_length(slug) <= 80 AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text CHECK (description IS NULL OR char_length(description) <= 300),
  active      boolean NOT NULL DEFAULT true,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.products (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name              text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  slug              text NOT NULL UNIQUE CHECK (char_length(slug) <= 80 AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  short_description text NOT NULL DEFAULT '' CHECK (char_length(short_description) <= 300),
  description       text CHECK (description IS NULL OR char_length(description) <= 5000),
  -- RESTRICT: uma categoria com produtos não pode ser excluída.
  category_id       bigint NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  -- Só a URL da imagem fica no banco; o arquivo fica no Storage (ou em /images).
  main_image_url    text CHECK (main_image_url IS NULL OR char_length(main_image_url) <= 1000),
  gallery_urls      text[] NOT NULL DEFAULT '{}' CHECK (cardinality(gallery_urls) <= 12),
  price             numeric(10,2) CHECK (price IS NULL OR price >= 0),
  sale_price        numeric(10,2) CHECK (sale_price IS NULL OR sale_price >= 0),
  -- Links independentes: um produto pode ter só Shopee, só Mercado Livre, ambos ou nenhum.
  shopee_url        text CHECK (shopee_url IS NULL OR (char_length(shopee_url) <= 1000 AND shopee_url ~ '^https://')),
  mercadolivre_url  text CHECK (mercadolivre_url IS NULL OR (char_length(mercadolivre_url) <= 1000 AND mercadolivre_url ~ '^https://')),
  featured          boolean NOT NULL DEFAULT false,
  active            boolean NOT NULL DEFAULT false,
  sort_order        integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT products_sale_price_below_price
    CHECK (sale_price IS NULL OR (price IS NOT NULL AND sale_price < price))
);

CREATE INDEX products_category_id_idx ON public.products (category_id);
CREATE INDEX products_listing_idx ON public.products (active, featured, sort_order);

CREATE TRIGGER categories_set_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER products_set_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Mesmo padrão das demais tabelas do projeto: RLS ligado e nenhuma política
-- para anon/authenticated. O navegador nunca lê nem grava direto no banco;
-- todo acesso passa pelas funções em /api (role app_service).
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Cliques por produto/marketplace (o histórico antigo por rótulo continua intacto).
ALTER TABLE public.clicks ADD COLUMN IF NOT EXISTS product_id bigint REFERENCES public.products(id) ON DELETE SET NULL;
ALTER TABLE public.clicks ADD COLUMN IF NOT EXISTS marketplace text
  CHECK (marketplace IS NULL OR marketplace IN ('shopee', 'mercadolivre'));
CREATE INDEX IF NOT EXISTS clicks_product_id_idx ON public.clicks (product_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON public.categories, public.products FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON public.categories, public.products FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_service') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories, public.products TO app_service;
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %s, %s TO app_service',
      pg_get_serial_sequence('public.categories', 'id'),
      pg_get_serial_sequence('public.products', 'id'));
  END IF;
END $$;

-- Bucket público para as imagens dos produtos (leitura pública pela URL;
-- gravação só pelo servidor, com a service key). Ignorado fora do Supabase.
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('products', 'products', true, 3145728, ARRAY['image/jpeg', 'image/png', 'image/webp'])
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

COMMIT;
