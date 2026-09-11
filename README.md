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
api/site.js            → páginas: /, /catalogo, /categoria/:slug, /produto/:slug, /privacidade, /sitemap.xml, /robots.txt, /admin, /admin/login
api/public.js          → /api/leads e /api/track-click
api/admin.js           → /api/admin/* (login, produtos, categorias, upload, leads, visitantes, cliques, conteúdo, senha)
api/_lib/              → código compartilhado (não vira função)
  site.js              → identidade da marca: nome, telefone, link do WhatsApp, logo, parceiro
  catalog.js           → consultas públicas do catálogo
  validate.js          → validação de entrada (inclui domínios aceitos de Shopee e Mercado Livre)
  rate-limit.js        → limite de envios por visitante (cadastro e cliques)
  storage.js           → upload/remoção de imagens no Supabase Storage
  views/               → HTML das páginas públicas e do painel
  handlers/            → lógica de cada endpoint
css/style.css          → site público      css/admin.css → painel
js/main.js             → menu, galeria, rastreio de cliques, formulário e pop-up de cadastro
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

**leads**: um registro por cadastro recebido: `name`, `email`, `instagram`, `source` (`popup` = pop-up de entrada, `site` = formulário "Seja um alpinista"), `consent_at`, `consent_version`, `created_at`. O mesmo e-mail pela mesma origem em 24 h não duplica.

**visitors** (visitantes): um registro por pessoa (e-mail): `name`, `instagram`, `first_source`, `last_source`, `signups` (quantos cadastros), `consent_at`, `consent_version`. Nome e Instagram já gravados não são trocados por um envio posterior (ninguém altera os dados de outra pessoa só digitando o e-mail dela); campos vazios são completados.

**rate_limits**: contador de envios por hash do IP e janela de tempo (o IP não é guardado; janelas com mais de 1 dia são apagadas).

## Pop-up de cadastro

- Abre 1,5 s depois que a pessoa entra em qualquer página pública (exceto aviso de privacidade, páginas de erro e pré-visualização do painel).
- Pede **nome**, **e-mail**, **Instagram (opcional)** e o consentimento (caixa não marcada + link para `/privacidade`).
- Cada envio grava um **lead** e cria/atualiza o **visitante** daquele e-mail.
- Cadastrou (no pop-up ou no formulário do rodapé): não aparece mais naquele navegador. Fechou sem cadastrar: volta depois de 7 dias.
- Ajustes em `js/main.js`: `POPUP_DELAY_MS` e `POPUP_SNOOZE_DAYS`. Se o texto do consentimento mudar, troque `CONSENT_VERSION` em `api/_lib/handlers/leads.js`.

## Painel administrativo (`/admin`)

O HTML do painel só é entregue para uma sessão válida; sem login, `/admin` redireciona para `/admin/login`.

Abas:

- **Painel**: números do catálogo.
- **Produtos**: busca, filtros, criar, editar, ativar/desativar, destacar, excluir com confirmação e visualizar antes de publicar. Produtos novos começam inativos.
- **Categorias**: criar, editar, ordenar, ativar/desativar, excluir com confirmação digitada.
- **Leads**: cada cadastro recebido (pop-up e formulário), com Instagram e origem.
- **Visitantes**: uma linha por pessoa. "Excluir" apaga o visitante e todos os leads do e-mail (pedido de remoção dos dados).
- **Cliques**: cliques por produto e marketplace.
- **Conteúdo**: textos do topo da home e faixa de promoção.
- **Segurança**: troca de senha.

## Segurança

- RLS ligado em todas as tabelas, sem políticas para `anon`/`authenticated`. O navegador nunca acessa o banco direto.
- Senha com hash bcrypt (8 a 72 caracteres), sessão com cookie `HttpOnly` + `Secure` + `SameSite=Lax`.
- Login: bloqueio após 5 tentativas erradas em 15 min por e-mail + IP (e 30 por e-mail no total), tentativas simultâneas serializadas no banco, mesmo tempo de resposta para e-mail existente ou não. Trocar a senha encerra as sessões de outros aparelhos.
- Conexão com o Postgres por TLS **com certificado validado** (CA raiz do Supabase em `api/_lib/supabase-ca.js`).
- LGPD: pop-up e formulário exigem consentimento explícito (data e versão do aviso ficam registradas), há a página `/privacidade`, e o painel permite excluir um cadastro ou todos os dados de uma pessoa.
- Cadastro e cliques: limite por visitante (5 cadastros e 60 cliques contados a cada 10 min por IP, guardando só um hash), além do campo honeypot contra bots.
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

1. No Supabase (SQL Editor), rodar as migrations em ordem: `001_catalog.sql`, `002_seed_alpins.sql`, `003_product_categories.sql` e `004_popup_visitors.sql`.
   - A 001 cria as tabelas, as permissões da role `app_service` e o bucket `products`.
   - A 002 migra os tênis Adventure Trail e Alpha Run para o catálogo, limpa os textos antigos do topo e troca o link antigo do Mercado Livre.
   - A 004 adiciona Instagram e consentimento em `leads` e cria `visitors` e `rate_limits`. **Rode antes do deploy do pop-up**: sem ela o cadastro responde erro.
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
