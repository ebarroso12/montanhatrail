-- 003_product_categories.sql — Um produto em várias categorias.
--
-- Migration ADITIVA: products.category_id continua existindo e passa a ser a
-- "categoria principal" (card e caminho da página). As demais categorias do
-- produto ficam em product_categories. A categoria atual de cada produto é
-- copiada para a tabela nova. Rodar uma única vez (SQL Editor do Supabase).

BEGIN;

CREATE TABLE public.product_categories (
  product_id  bigint NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  -- RESTRICT: uma categoria usada por algum produto não pode ser excluída.
  category_id bigint NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, category_id)
);

CREATE INDEX product_categories_category_id_idx ON public.product_categories (category_id);

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

-- A categoria principal sempre faz parte das categorias do produto.
CREATE OR REPLACE FUNCTION public.link_main_category() RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.product_categories (product_id, category_id)
  VALUES (NEW.id, NEW.category_id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER products_link_main_category
  AFTER INSERT OR UPDATE OF category_id ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.link_main_category();

INSERT INTO public.product_categories (product_id, category_id)
SELECT id, category_id FROM public.products
ON CONFLICT DO NOTHING;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON public.product_categories FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON public.product_categories FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_service') THEN
    GRANT SELECT, INSERT, DELETE ON public.product_categories TO app_service;
  END IF;
END $$;

COMMIT;
