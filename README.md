# NFC Connect

Painel para administrar os links gravados em **TAGs NFC** e **QR Codes** de cartões vendidos a negócios locais:

- **Cartão de avaliação**: leva ao link de avaliação do Google.
- **Cartão de pagamento Pix**: abre uma página com o QR Code Pix e um botão "Copia e Cola" (gerados a partir da chave), ou redireciona para um link de pagamento do banco.
- **Cartão de visita**: leva ao Instagram (`@perfil`) ou a um site.

Cada link ganha um endereço público `https://seu-dominio.com.br/{negocio}/{link}`, que conta o acesso, salva os dados do dispositivo e redireciona para a URL de destino.

## Stack

| Camada | Tecnologia |
| --- | --- |
| App | Next.js 16 (App Router, Server Actions, `proxy.ts`) |
| UI | Tailwind CSS v4 + shadcn/ui (Base UI) + temas por variáveis CSS |
| Backend | Supabase (Auth, Postgres, RLS) |
| Testes | Vitest |
| Deploy | Vercel |

## Funcionalidades

- Login de administrador (Supabase Auth, e-mail e senha). Cada administrador só vê os próprios negócios (RLS).
- Negócios: listar, criar, editar e excluir.
- Links: listar, criar, editar, ativar/desativar e excluir. O endereço é gerado a partir do nome e pode ser editado.
- URL da TAG NFC e QR Code para download (PNG 1024px e SVG). O QR Code aponta para `...?s=qr`, para separar a origem nas estatísticas.
- Contador por link e registro de cada acesso: data, origem (NFC/QR), dispositivo, fabricante, sistema, navegador, idioma, referer, país/estado/cidade/coordenadas (geolocalização da Vercel) e o hash do IP.
- Painel de acessos (7, 30 ou 90 dias): total, visitantes únicos, acessos por dia, quebras por origem, dispositivo, sistema, navegador e cidade, e os últimos acessos. Exportação em CSV.
- Robôs de pré-visualização (WhatsApp, Instagram, Google...) ficam registrados mas não entram no contador.
- Landing page de vendas na home e modelos de cartão prontos para impressão (gráfica ou folha A4).
- Quiz de vendas em `/comecar`: busca o negócio no Google, mostra diagnóstico, meta, prazo estimado e kit recomendado, e captura o contato. Os pedidos aparecem em **Painel → Pedidos**, onde um clique cria o negócio e o link de avaliação.
- **Cartões em branco** (Painel → Cartões): gera lotes de cartões ou placas com código único (`/c/{codigo}`), PDF de impressão com o QR de cada peça (gráfica: frente e verso em sequência; ou folhas A4) e CSV com os links para gravar nos chips NFC.
- **Ativação**: a primeira pessoa que abrir uma peça em branco busca o negócio no Google. O sistema cria o negócio (ou reaproveita o mesmo Place ID), um link de avaliação só daquela peça, coleta os dados do Google Maps e gera a análise do perfil com IA.
- **Google Maps** na página do negócio: nota, avaliações, checklist do perfil, análise da IA (OpenAI) com melhorias e uma mensagem para oferecer o serviço de otimização.
- **Evolução** (Painel → Evolução): avaliações novas em 7 e 30 dias e desde o início de todos os clientes, atualizadas por um cron semanal.
- Tema claro (padrão) e escuro.

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha as variáveis
npm run dev
```

### 1. Criar o banco no Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Aplique a migration [`supabase/migrations/20261003000000_init.sql`](supabase/migrations/20261003000000_init.sql) de uma destas formas:
   - cole o conteúdo no **SQL Editor** do painel do Supabase e execute; ou
   - com a CLI: `supabase link --project-ref SEU_REF` e depois `npm run db:push`.
3. Em **Authentication → Users → Add user**, crie o usuário administrador (e-mail e senha).
4. Recomendado: em **Authentication → Sign In / Providers**, desative "Allow new users to sign up". O sistema não tem cadastro público.

### 2. Variáveis de ambiente

| Variável | Descrição |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave publicável (`sb_publishable_...`) ou a antiga `anon` |
| `SUPABASE_SECRET_KEY` | Chave secreta (`sb_secret_...`) ou a antiga `service_role`. Usada **só no servidor**, nas rotas públicas de redirecionamento e Pix |
| `NEXT_PUBLIC_SITE_URL` | Domínio usado nos links das TAGs e QR Codes (ex.: `https://cartoes.com.br`) |
| `IP_HASH_SALT` | Texto aleatório para anonimizar IPs (`openssl rand -hex 32`) |
| `GOOGLE_PLACES_API_KEY` | Opcional. Google Places API (New): busca do negócio no quiz e na ativação. Sem ela, os formulários pedem nome e cidade |
| `APIFY_TOKEN` | Token da Apify. Fonte das métricas do Google Maps (painel, Evolução, cron) via scraper |
| `APIFY_MAPS_ACTOR` | Opcional. Actor do scraper (padrão `compass~crawler-google-places`) |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | WhatsApp da TopTap (55 + DDD + número), usado no fim do quiz |
| `OPENAI_API_KEY` | Chave da OpenAI para a análise do perfil no Google. Sem ela, o painel mostra só o checklist |
| `OPENAI_MODEL` | Opcional. Modelo da análise (padrão `gpt-5-mini`) |
| `CRON_SECRET` | Segredo do cron semanal `/api/cron/google` (a Vercel envia no cabeçalho `Authorization`) e do webhook da Apify |

## Deploy na Vercel

1. Importe o repositório na Vercel (o framework Next.js é detectado sozinho).
2. Cadastre as variáveis de ambiente acima.
3. Configure o domínio definitivo **antes** de gravar as TAGs: os endereços gravados não podem ser alterados depois.

Se `NEXT_PUBLIC_SITE_URL` não estiver definida, o sistema usa o domínio de produção da Vercel (`VERCEL_PROJECT_PRODUCTION_URL`).

## Quiz de vendas (`/comecar`)

1. Busca do negócio: com a Places API, autocomplete enquanto digita (Autocomplete + Place Details, no servidor). Sem ela e com `APIFY_TOKEN`, a pessoa digita nome e cidade e clica em **Buscar no Google** (scraper da Apify, de 15 a 60 s, até 3 resultados). Cada busca fica em cache por 7 dias (`maps_searches`) e há limite de 5 buscas por hora por visitante. Sem nenhuma das duas, cadastro manual.
2. Como funciona, meta, onde o cliente paga, clientes por dia e pontos de atendimento.
3. Plano: diagnóstico, prazo estimado, kit recomendado com preço, e escolha visual do estilo e do modelo da placa e do cartão.
4. Nome + WhatsApp: o pedido vira lead em `leads` e o cliente pode enviar o resumo pelo WhatsApp.

O progresso é salvo a cada etapa (status `quiz`) e vira `lead` ao receber o WhatsApp. Kit, valor e prazo são recalculados no servidor. Preços em [`src/lib/pricing.ts`](src/lib/pricing.ts); regras da projeção em [`src/lib/quiz.ts`](src/lib/quiz.ts) (`PROJECTION`: 26 dias × 1% dos clientes avaliando, ajuste com dados reais).

## Cartões em branco e ativação

```
Painel → Cartões → Gerar lote (ex.: 50 cartões)
   → Imprimir (PDF com QR único por peça)  → gráfica
   → Links (CSV)                            → gravar cada chip NFC na ordem

Cliente abre a peça (/c/k7m2p9qa)
   ├─ em branco → /c/k7m2p9qa/ativar → busca no Google → cria negócio + link de avaliação
   │                                    → coleta do Google Maps + análise da IA (after())
   └─ ativada   → conta o acesso e redireciona para a avaliação (igual aos links normais)
```

- Qualquer pessoa com a peça em mãos pode ativá-la. Sem a Places API, informa nome, cidade e o link de avaliação do Google (`g.page/r/.../review`). Se o mesmo link (ou Place ID) já existir, a peça entra no mesmo negócio com o próprio link.
- Excluir o negócio libera as peças dele para uma nova ativação.

## Métricas do Google Maps (Apify)

O [Google Maps Scraper](https://apify.com/compass/crawler-google-places) da Apify busca cada negócio (por Place ID ou por "Nome, Cidade - UF") e traz nota, avaliações, distribuição de estrelas, total de fotos, horário, contato e as 20 avaliações mais recentes (com a resposta do dono).

```
Ativação / "Atualizar dados"  → execução síncrona (até ~4 min) → place_snapshots (+ place_id no negócio)
Cron semanal (segunda, 6h)    → 1 execução com todos os clientes → Apify chama /api/apify/webhook → place_snapshots
```

- A busca por nome só é aceita se o nome encontrado tiver uma palavra em comum com o cadastrado. Se achar o negócio errado, use **Desvincular** no painel e ajuste o texto da busca.
- O cron pula negócios coletados nos últimos 5 dias; o webhook ignora reenvios.
- Custo aproximado: US$ 1,50 por mil negócios + US$ 0,0005 por avaliação (veja o preço atual na página do Actor).

## Como funciona o redirecionamento

```
TAG NFC  →  /padaria/avaliacao        ─┐
QR Code  →  /padaria/avaliacao?s=qr   ─┤→ busca link ativo → 302 para a URL de destino
                                       └→ after(): grava o acesso em link_visits
                                           (gatilho incrementa links.click_count)
```

- O redirecionamento responde antes de gravar o acesso (`after()`), então o cliente não espera o banco.
- A resposta usa `Cache-Control: no-store`, para que nenhum acesso deixe de ser contado.
- O IP nunca é salvo em claro, apenas `SHA-256(salt + IP)`, o que basta para contar visitantes únicos (LGPD).
- Links Pix sem URL de destino vão para `/{negocio}/{link}/pix`, que gera o BR Code conforme o manual do Banco Central.

## Tema e identidade visual

- Cores da marca TopTap em [`src/app/globals.css`](src/app/globals.css), nos blocos `:root` (claro) e `.dark` (escuro), no padrão de variáveis do shadcn/ui. Para mudar o visual, troque os valores ali.
- O tema claro é o padrão. O botão de sol/lua alterna para o escuro (`next-themes`).
- Logo em [`src/components/brand/logo.tsx`](src/components/brand/logo.tsx) e arquivos originais em `public/brand/`.

## Testes

```bash
npm test            # roda uma vez
npm run test:watch  # modo observação
npm run typecheck
npm run lint
```

Os testes unitários ficam em [`src/lib/__tests__`](src/lib/__tests__) e cobrem:

| Módulo | O que é testado |
| --- | --- |
| `slug` | geração de endereços (acentos, símbolos), validação, slugs reservados |
| `urls` | URL da TAG/QR, domínio base, normalização de destino (`@perfil`, sem `https://`, protocolos inválidos) |
| `user-agent` | detecção de navegador/app, sistema, tipo de aparelho, fabricante e robôs |
| `visit` | IP via proxy, hash do IP, origem NFC/QR, idioma, geolocalização da Vercel |
| `redirect` | decisão de redirecionamento, página Pix, 404, registro adiado do acesso |
| `pix` | CRC16, BR Code (incluindo o exemplo oficial do Banco Central), chaves CPF/CNPJ/telefone/e-mail/aleatória |
| `analytics` | totais, únicos, série diária no fuso de São Paulo, agrupamento "Outros", períodos |
| `validation` | formulários de negócio, link e login |
| `csv` | escape RFC 4180 e proteção contra injeção de fórmulas |

## Estrutura

```
src/
  app/
    [business]/[link]/route.ts      redirecionamento público + contagem
    [business]/[link]/pix/page.tsx  página Pix Copia e Cola
    dashboard/                      painel (negócios, links, estatísticas, CSV)
    login/                          login
  components/
    dashboard/                      formulários, QR Code, gráficos
    theme/                          provedores e seletor de tema
    ui/                             componentes shadcn/ui
  lib/                              regras de negócio (testadas) e clientes Supabase
  proxy.ts                          sessão e proteção do /dashboard
supabase/migrations/                schema, RLS e gatilhos
```
