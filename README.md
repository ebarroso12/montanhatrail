# Alpins — Catálogo de produtos + Painel administrativo

Catálogo da **Alpins** com produtos de várias categorias. Cada produto leva o visitante para a página correspondente na **Shopee** e/ou no **Mercado Livre**. Um painel administrativo protegido permite cadastrar produtos e categorias sem editar código.

Contato exibido no site: WhatsApp **(16) 99127-1838**.

## Stack

Sem build step e com só duas dependências (`pg`, `bcryptjs`):

- **Páginas públicas** renderizadas no servidor por funções da Vercel (HTML + CSS + um pouco de JS vanilla). Cada produto tem HTML e meta tags próprios para SEO, e a CDN guarda as páginas por 60 s.
- **Banco**: Supabase Postgres, acessado só pelas funções (role `app_service`).
- **Imagens**: Supabase Storage (bucket público `products`). O banco guarda só a URL.
- **Autenticação**: própria (bcrypt + sessão em cookie `HttpOnly`), a mesma do projeto anterior.

```
api/site.js            → páginas: /, /catalogo, /categoria/:slug, /produto/:slug, /sitemap.xml, /robots.txt, /admin, /admin/login
api/public.js          → /api/leads e /api/track-click
api/admin.js           → /api/admin/* (login, produtos, categorias, upload, leads, cliques, conteúdo, senha)
api/_lib/              → código compartilhado (não vira função)
  site.js              → identidade da marca: nome, telefone, link do WhatsApp, logo, parceiro
  catalog.js           → consultas públicas do catálogo
  validate.js          → validação de entrada (inclui domínios aceitos de Shopee e Mercado Livre)
  storage.js           → upload/remoção de imagens no Supabase Storage
  views/               → HTML das páginas públicas e do painel
  handlers/            → lógica de cada endpoint
css/style.css          → site público      css/admin.css → painel
js/main.js             → menu, galeria, rastreio de cliques, formulário
js/admin.js            → painel           js/admin-login.js → tela de login
migrations/            → SQL do banco (rodar no SQL Editor do Supabase)
vercel.json            → rotas, redirects e headers de segurança
```

As rotas ficam agrupadas em 3 funções para respeitar o limite de funções por deploy do plano Hobby da Vercel.

## Modelo de dados

**categories**: `id`, `name`, `slug` (único), `description`, `active`, `sort_order`, `created_at`, `updated_at`.

**products**: `id`, `name`, `slug` (único), `short_description`, `description`, `category_id` (categoria principal), `main_image_url`, `gallery_urls` (até 12), `price`, `sale_price`, `shopee_url`, `mercadolivre_url`, `featured`, `active`, `sort_order`, `created_at`, `updated_at`.

- Os links de Shopee e Mercado Livre são **independentes**: o produto pode ter um, os dois ou nenhum. O botão só aparece quando o link existe.
- `sale_price` precisa ser menor que `price`; quando existe, o site mostra o selo de promoção.
- **product_categories** (`product_id`, `category_id`): um produto pode estar em **várias categorias** (ex.: um tênis unissex em "Tênis Masculino" e "Tênis Feminino"). A categoria principal sempre faz parte dessa lista (garantido por trigger); ela é a que aparece no card e no caminho da página.
- Uma categoria usada por algum produto **não pode ser excluída** (proteção no banco e na API).
- Para adicionar outro marketplace no futuro: nova coluna em `products` + entrada em `MARKETPLACES` (`api/_lib/validate.js`) + rótulo do botão (`api/_lib/views/components.js`).

## Painel administrativo (`/admin`)

O HTML do painel só é entregue para uma sessão válida; sem login, `/admin` redireciona para `/admin/login`.

Abas:

- **Painel**: números do catálogo.
- **Produtos**: busca, filtros, criar, editar, ativar/desativar, destacar, excluir com confirmação e visualizar antes de publicar. Produtos novos começam inativos.
- **Categorias**: criar, editar, ordenar, ativar/desativar, excluir com confirmação digitada.
- **Leads**: e-mails do formulário "Seja um alpinista".
- **Cliques**: cliques por produto e marketplace.
- **Conteúdo**: textos do topo da home e faixa de promoção.
- **Segurança**: troca de senha.

## Segurança

- RLS ligado em todas as tabelas, sem políticas para `anon`/`authenticated`. O navegador nunca acessa o banco direto.
- Senha com hash bcrypt, sessão com cookie `HttpOnly` + `Secure` + `SameSite=Lax`, bloqueio após 5 tentativas erradas em 15 min.
- Operações de escrita do painel exigem sessão válida, corpo JSON e origem igual à do site (proteção contra CSRF).
- Validação no servidor de todos os campos. Os links de compra só aceitam `https` e os domínios oficiais: `shopee.com.br`, `shope.ee`, `shp.ee`, `mercadolivre.com.br`, `mercadolivre.com`, `meli.la`.
- Upload: o tipo real do arquivo é conferido pelos bytes (JPG, PNG ou WebP, até 3 MB). A service key do Supabase só existe no servidor.
- Content-Security-Policy sem scripts inline; links comerciais com `rel="noopener noreferrer sponsored"`.

## Variáveis de ambiente (Vercel → Settings → Environment Variables)

Veja `.env.example`. Nunca commitar valores.

| Variável | Uso |
|---|---|
| `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` | Postgres via pooler Supavisor (modo transação, porta 6543). O usuário segue o formato `app_service.<ref_do_projeto>`. |
| `SUPABASE_URL` | URL do projeto Supabase (upload de imagens). |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave secreta do Supabase (legacy `service_role` ou `sb_secret_…`). **Somente servidor.** |
| `SUPABASE_STORAGE_BUCKET` | Opcional, padrão `products`. |
| `SITE_URL` | Opcional: URL canônica (ex.: domínio próprio). |

Sem as variáveis do Supabase Storage, o painel continua funcionando com URLs de imagens coladas manualmente.

## Publicação (ordem recomendada)

1. No Supabase (SQL Editor), rodar `migrations/001_catalog.sql`, depois `migrations/002_seed_alpins.sql` e por último `migrations/003_product_categories.sql`.
   - A 001 cria as tabelas, as permissões da role `app_service` e o bucket `products`.
   - A 002 migra os tênis Adventure Trail e Alpha Run para o catálogo, limpa os textos antigos do topo e troca o link antigo do Mercado Livre.
2. Na Vercel, adicionar `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`.
3. Fazer o deploy da branch.

Rodar as migrations antes do deploy evita que o site novo suba sem as tabelas.

## Logomarca

Arquivos em `images/marca/`, gerados a partir da arte original (1254×1254):

| Arquivo | Uso |
|---|---|
| `alpins-logo.jpg` (1200×1200) | imagem padrão ao compartilhar o site (Open Graph) |
| `alpins-logo-rodape.jpg` (640×624) | logo completa com slogan, no rodapé |
| `alpins-simbolo.jpg` (192×192) | símbolo "A" no cabeçalho (ao lado do nome em texto) e no painel |
| `favicon-64.png`, `apple-touch-icon.png` | ícone da aba e da tela inicial do celular |

Para trocar a logo, substitua esses arquivos mantendo os nomes; os caminhos ficam em `api/_lib/site.js` (`logo` e `ogImage`).

## Checagem local

```
npm install
npm run check
```

O `npm run check` verifica a sintaxe de todos os arquivos `.js`, se o `vercel.json` aponta para funções que existem e se cada função carrega.

## Imagens

- **Fotos dos produtos migrados**: estão em `/images` e são referenciadas pelo banco.
- **Novas imagens**: enviadas pelo painel e armazenadas no Supabase Storage.
- **Logo do parceiro Selah**: em `/images/parceiros/selah.png`.

## Deploy

Publicado na Vercel a partir do repositório GitHub `ebarroso12/montanhatrail`. Qualquer push na `main` gera um novo deploy automaticamente.
