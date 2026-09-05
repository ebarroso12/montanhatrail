# Adventure Trail — Landing Page

Landing page de vendas do tênis **Adventure Trail** (trilhas e caminhadas), recriada a partir do projeto original feito no Manus (que ficou sem créditos) para poder continuar a evolução no GitHub + Vercel.

## Stack

Site estático puro — HTML + CSS + JS vanilla, sem build step. Fácil de hospedar em qualquer lugar (Vercel, Netlify, GitHub Pages) e fácil de continuar editando.

```
index.html      → estrutura da página (todas as seções)
css/style.css   → design tokens, layout e responsividade
js/main.js      → calculadora de tamanho, toggle trilha/caminhada, lightbox da galeria, menu mobile
```

## O que já está implementado

- Hero com CTA para Shopee e Mercado Livre
- Seção "Essência" e "Seu caminho" (toggle Trilha/Caminhada)
- Atributos do produto (Conforto, Solado antiderrapante, Trilhas e caminhadas)
- Guia de tamanhos com calculadora interativa: o usuário digita o comprimento do pé em cm (ou clica direto num tamanho da tabela) e o site sugere a numeração BR mais próxima, com animação de destaque
- Galeria com lightbox (ampliar foto)
- Rodapé com o parceiro Selah (selaah.com.br), assinatura do desenvolvedor (Dr. Edson Barroso) e dados institucionais da New Story Footwear

## Imagens

As fotos do produto (`/images/*.jpg`) são as fotos reais do tênis Mountain Trail, baixadas do Google Drive compartilhado pelo Wendel e convertidas de HEIC para JPEG — já fazem parte deste repositório, não dependem do Manus continuar no ar.

A única coisa que ainda vem de fora é a logomarca do app parceiro Selah, referenciada direto de `tenismontanha.manus.space` (não foi encontrada nos drives compartilhados). Se o Manus sair do ar, essa logo some do rodapé — o resto da página continua normal. Basta pedir o arquivo da logo (PNG com fundo transparente) e colocar em `/images/selaah-logo.png`, trocando o `src` correspondente no `index.html`.

## Próximos passos (não incluídos ainda)

O projeto original no Manus estava, no momento em que os créditos acabaram, no meio da construção de um **painel administrativo** com:

- Login administrativo (usuário: `edson.barroso@gmail.com`)
- Captura de leads
- Contagem de cliques
- Edição de imagens/conteúdo pelo painel

Isso ainda não existe neste projeto — precisa ser construído do zero (o código do painel ficou no Manus e não foi possível recuperá-lo). Requer decisões de arquitetura (onde guardar os leads, como proteger o login, etc.) antes de implementar.

## Deploy

Publicado na Vercel a partir do repositório GitHub `ebarroso12/montanhatrail` (branch `main`). Qualquer push na `main` gera um novo deploy automaticamente.
