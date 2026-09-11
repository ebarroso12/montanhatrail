-- 006_remover_product_images.sql — Remove a tabela de fotos do site antigo
-- (as fotos dos produtos agora ficam no Supabase Storage).
-- SÓ RODAR se a conferência da 005 mostrou tabela_antiga_bytes = 0 ou vazio.
-- Nenhum código do site usa essa tabela.

DROP TABLE IF EXISTS public.product_images;

-- Conferência. Esperado: true
SELECT to_regclass('public.product_images') IS NULL AS removida;
