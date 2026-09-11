-- 004_popup_visitors.sql — Pop-up de cadastro (nome, e-mail, Instagram),
-- visitantes e limite de envios por IP.
-- ADITIVA e segura para rodar de novo (IF NOT EXISTS / ON CONFLICT).
-- Rodar no SQL Editor do Supabase ANTES do deploy desta versão.

BEGIN;

-- leads: Instagram e registro do consentimento
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS instagram text
    CHECK (instagram IS NULL OR instagram ~ '^[a-z0-9._]{1,30}$'),
  ADD COLUMN IF NOT EXISTS consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS consent_version text;

-- a versão do consentimento ficava no campo source
UPDATE public.leads
   SET consent_version = source,
       consent_at = created_at,
       source = 'site'
 WHERE source LIKE 'site:consentimento-%';

-- visitors: uma linha por pessoa (e-mail)
CREATE TABLE IF NOT EXISTS public.visitors (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email text NOT NULL UNIQUE
    CHECK (char_length(email) <= 254 AND email = lower(email)),
  name text CHECK (name IS NULL OR char_length(name) <= 120),
  instagram text
    CHECK (instagram IS NULL OR instagram ~ '^[a-z0-9._]{1,30}$'),
  first_source text NOT NULL
    CHECK (first_source IN ('site', 'popup')),
  last_source text NOT NULL
    CHECK (last_source IN ('site', 'popup')),
  signups integer NOT NULL DEFAULT 1 CHECK (signups >= 1),
  consent_at timestamptz NOT NULL,
  consent_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS visitors_set_updated_at ON public.visitors;
CREATE TRIGGER visitors_set_updated_at
  BEFORE UPDATE ON public.visitors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- quem já se cadastrou com consentimento vira visitante
INSERT INTO public.visitors
  (email, name, first_source, last_source, signups,
   consent_at, consent_version, created_at)
SELECT lower(email),
       left(max(nullif(btrim(name), '')), 120),
       'site', 'site', count(*)::int,
       max(consent_at), max(consent_version), min(created_at)
  FROM public.leads
 WHERE consent_version IS NOT NULL
   AND char_length(email) <= 254
 GROUP BY lower(email)
ON CONFLICT (email) DO NOTHING;

-- rate_limits: contador por hash do IP (o IP não é guardado)
CREATE TABLE IF NOT EXISTS public.rate_limits (
  bucket text NOT NULL,
  key_hash text NOT NULL,
  window_start timestamptz NOT NULL,
  hits integer NOT NULL DEFAULT 1,
  PRIMARY KEY (bucket, key_hash, window_start)
);

-- mesmo padrão das outras tabelas: RLS sem políticas públicas
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON public.visitors, public.rate_limits FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON public.visitors, public.rate_limits FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_service') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE
      ON public.visitors, public.rate_limits TO app_service;
    GRANT SELECT, INSERT, DELETE ON public.leads TO app_service;
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %s TO app_service',
      pg_get_serial_sequence('public.visitors', 'id'));
  END IF;
END $$;

COMMIT;

-- conferência: deve mostrar colunas_novas = 3, visitors = true, rate_limits = true
SELECT
  (SELECT count(*) FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leads'
      AND column_name IN ('instagram', 'consent_at', 'consent_version')) AS colunas_novas,
  to_regclass('public.visitors') IS NOT NULL AS visitors,
  to_regclass('public.rate_limits') IS NOT NULL AS rate_limits;
