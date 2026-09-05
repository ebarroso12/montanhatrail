# Adventure Trail — Landing Page + Painel Administrativo

Landing page de vendas do tênis **Adventure Trail** (trilhas e caminhadas), recriada a partir do projeto original feito no Manus (que ficou sem créditos) para poder continuar a evolução no GitHub + Vercel. Agora inclui um painel administrativo real (login, captura de leads, contagem de cliques e edição de conteúdo).

## Stack

Site estático (HTML + CSS + JS vanilla, sem build step) + funções serverless na Vercel (`/api`) + banco de dados Supabase (Postgres).

```
index.html      → estrutura da página pública (todas as seções)
css/style.css   → design tokens, layout e responsividade
js/main.js      → calculadora de tamanho, toggle trilha/caminhada, lightbox, rastreio de cliques, formulário de leads, overrides de conteúdo
admin/          → páginas do painel administrativo (login + dashboard)
api/            → funções serverless (Node.js) que atendem o site público e o painel
package.json    → dependências das funções serverless (pg, bcryptjs)
```

## O que já está implementado no site público

- Hero com CTA para Shopee e Mercado Livre
- Seção "Essência" e "Seu caminho" (toggle Trilha/Caminhada)
- Atributos do produto (Conforto, Solado antiderrapante, Trilhas e caminhadas)
- Guia de tamanhos com calculadora interativa
- Galeria com lightbox (ampliar foto)
- Formulário "Fique por dentro" (captura de leads — nome opcional + e-mail)
- Rastreamento de clique em todos os botões de Shopee/Mercado Livre
- Faixa de promoção opcional no topo (liga/desliga pelo painel)
- Rodapé com o parceiro Selah (selaah.com.br), assinatura do desenvolvedor (Dr. Edson Barroso) e dados institucionais da New Story Footwear

## Painel administrativo (`/admin`)

Acesse `https://<seu-domínio>/admin/index.html` e entre com o e-mail `edson.barroso@gmail.com` e a senha inicial (gerada uma única vez e enviada por fora do código-fonte — **troque-a assim que entrar**, na aba "Segurança" do painel).

O painel tem 4 abas:

- **Leads** — lista de e-mails capturados pelo formulário "Fique por dentro" do site.
- **Cliques** — total de cliques em cada botão de Shopee/Mercado Livre, com o recorte dos últimos 7 dias.
- **Conteúdo** — permite editar o texto do hero (selo, título, subtítulo), os links de Shopee/Mercado Livre e a faixa de promoção, sem tocar em código. As mudanças aparecem no site em poucos segundos.
- **Segurança** — trocar a senha de acesso.

### Arquitetura e decisões de segurança

- **Banco de dados**: projeto Supabase dedicado (`adventure-trail`, região `sa-east-1`), criado exclusivamente para este site — nenhuma tabela é compartilhada com outros projetos.
- **RLS (Row Level Security)** ativado em todas as tabelas, sem nenhuma política para os papéis públicos (`anon`/`authenticated`). Isso significa que ninguém consegue ler nem escrever nada direto do navegador — todo acesso passa exclusivamente pelas funções serverless em `/api`, que se conectam ao Postgres do projeto usando uma role dedicada (`app_service`, com `BYPASSRLS` e permissões apenas nas tabelas deste app), cuja senha é guardada só nas variáveis de ambiente da Vercel e nunca exposta ao navegador.
- **Login**: senha guardada com hash `bcrypt` (nunca em texto puro). Sessão de administrador via cookie `HttpOnly` + `Secure` + `SameSite=Lax`, token aleatório opaco (não é um JWT, então uma sessão pode ser revogada instantaneamente apagando a linha no banco).
- **Proteção contra força bruta**: após 5 tentativas de login incorretas para o mesmo e-mail em 15 minutos, novas tentativas são bloqueadas temporariamente.
- **Captura de leads**: endpoint público, mas com validação de e-mail e um campo-armadilha (honeypot) invisível para descartar envios automatizados simples.
- **Conteúdo editável**: lista fechada de campos (`hero_eyebrow`, `hero_title_line1`, `hero_title_line2`, `hero_subtitle`, `shopee_url`, `mercadolivre_url`, `promo_banner_enabled`, `promo_banner_text`) — o painel nunca pode gravar nada fora dessa lista.

### Variáveis de ambiente necessárias na Vercel

No projeto da Vercel (Settings → Environment Variables), definir:

```
PGHOST=db.eogykziuhsblzulqvika.supabase.co
PGPASSWORD=<senha da role app_service — nunca commitar no git>
```

Opcional (já têm esses valores como padrão no código, só precisam ser definidos se algo mudar):

```
PGUSER=app_service
PGDATABASE=postgres
PGPORT=5432
```

Sem essas variáveis, o site público continua funcionando normalmente (só o formulário de leads, o rastreio de cliques e o painel ficam inativos) — é um "progressive enhancement", nunca um requisito para a página carregar.

## Imagens

As fotos do produto (`/images/*.jpg`) são as fotos reais do tênis Mountain Trail, baixadas do Google Drive compartilhado pelo Wendel e convertidas de HEIC para JPEG — já fazem parte deste repositório, não dependem do Manus continuar no ar.

A única coisa que ainda vem de fora é a logomarca do app parceiro Selah, referenciada direto de `tenismontanha.manus.space` (não foi encontrada nos drives compartilhados). Se o Manus sair do ar, essa logo some do rodapé — o resto da página continua normal. Basta pedir o arquivo da logo (PNG com fundo transparente) e colocar em `/images/selaah-logo.png`, trocando o `src` correspondente no `index.html`.

## Deploy

Publicado na Vercel a partir do repositório GitHub `ebarroso12/montanhatrail` (branch `main`). Qualquer push na `main` gera um novo deploy automaticamente.
