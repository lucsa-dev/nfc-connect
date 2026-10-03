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
- Tema claro/escuro/sistema e 6 paletas de cor, trocadas pelo botão de paleta no topo.

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

## Deploy na Vercel

1. Importe o repositório na Vercel (o framework Next.js é detectado sozinho).
2. Cadastre as variáveis de ambiente acima.
3. Configure o domínio definitivo **antes** de gravar as TAGs: os endereços gravados não podem ser alterados depois.

Se `NEXT_PUBLIC_SITE_URL` não estiver definida, o sistema usa o domínio de produção da Vercel (`VERCEL_PROJECT_PRODUCTION_URL`).

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

## Temas

- **Claro/escuro/sistema**: `next-themes` (classe `.dark` no `<html>`).
- **Paletas de cor**: atributo `data-palette` no `<html>`, salvo no navegador.

Para criar uma paleta nova:

1. adicione os blocos `[data-palette="minha-cor"]` e `.dark[data-palette="minha-cor"]` em [`src/app/themes.css`](src/app/themes.css);
2. registre a paleta em [`src/lib/themes.ts`](src/lib/themes.ts).

Para mudar a paleta padrão, altere `DEFAULT_PALETTE` em `src/lib/themes.ts`. As cores-base (fundo, bordas, raio) ficam em `src/app/globals.css` e seguem o padrão do shadcn/ui, então temas gerados em [ui.shadcn.com/themes](https://ui.shadcn.com/themes) podem ser colados direto ali.

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
