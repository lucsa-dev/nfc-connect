-- Relatório de concorrência, mapa de ranking e prospecção.
--
-- Fontes:
-- - Scraper da Apify (concorrentes, avaliações, prospecção): guardado sem prazo.
-- - Google Places API: os termos de uso só permitem guardar o Place ID por tempo
--   indeterminado; o restante do conteúdo pode ficar em cache por até 30 dias.
--   Por isso essas linhas têm expires_at e são apagadas pela limpeza diária
--   (/api/cron/limpeza). As consultas também ignoram o que já expirou.

-- Relatórios de concorrência -----------------------------------------------------
-- Um por geração. Pode ser de um cliente (business_id) ou de um prospecto ainda
-- sem cadastro (só place_id). O token forma o link público /relatorio/{token}.
create table public.market_reports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  business_id uuid references public.businesses (id) on delete cascade,
  place_id text not null check (char_length(place_id) <= 300),
  name text not null check (char_length(name) between 1 and 200),
  token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  -- O que o cliente do negócio digita no Maps ("padaria") e onde ("Aldeota, Fortaleza")
  term text not null check (char_length(term) between 2 and 80),
  area text not null check (char_length(area) between 2 and 120),
  status text not null default 'running' check (status in ('running', 'ready', 'failed')),
  -- Execução do scraper na Apify (o painel confere o andamento até terminar)
  run_id text,
  -- Dados prontos para a página (src/lib/market.ts: MarketData)
  data jsonb,
  -- Comparação das avaliações feita pela IA (src/lib/market-analysis.ts: MarketAnalysis)
  analysis jsonb,
  error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create index market_reports_owner_idx on public.market_reports (owner_id, created_at desc);
create index market_reports_business_idx on public.market_reports (business_id, created_at desc);
create index market_reports_place_idx on public.market_reports (owner_id, place_id, created_at desc);

-- Mapa de ranking (Places API: expira em 30 dias) --------------------------------
-- Posição do negócio na busca do Google em uma grade de pontos ao redor dele.
create table public.rank_grids (
  id bigint generated always as identity primary key,
  report_id uuid not null references public.market_reports (id) on delete cascade,
  term text not null,
  center_lat double precision not null,
  center_lng double precision not null,
  spacing_m integer not null check (spacing_m between 100 and 5000),
  size integer not null check (size between 3 and 9),
  -- src/lib/rank-grid.ts: GridPoint[] (posição e os 3 primeiros Place IDs de cada ponto)
  points jsonb not null default '[]',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days'
);

create index rank_grids_report_idx on public.rank_grids (report_id, created_at desc);
create index rank_grids_expires_idx on public.rank_grids (expires_at);

-- Coletas vindas da Places API também expiram em 30 dias -------------------------
alter table public.place_snapshots add column source text not null default 'apify'
  check (source in ('apify', 'places'));
alter table public.place_snapshots add column expires_at timestamptz;
create index place_snapshots_expires_idx on public.place_snapshots (expires_at) where expires_at is not null;

-- Prospecção ---------------------------------------------------------------------
-- Busca de negócios de uma categoria numa região, com nota de oportunidade.
create table public.prospect_searches (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  term text not null check (char_length(term) between 2 and 80),
  area text not null check (char_length(area) between 2 and 120),
  status text not null default 'running' check (status in ('running', 'ready', 'failed')),
  run_id text,
  -- src/lib/market.ts: Prospect[]
  results jsonb not null default '[]',
  error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create index prospect_searches_owner_idx on public.prospect_searches (owner_id, created_at desc);

-- RLS ----------------------------------------------------------------------------
-- A página pública do relatório usa a chave secreta e busca pelo token.
alter table public.market_reports enable row level security;
alter table public.rank_grids enable row level security;
alter table public.prospect_searches enable row level security;

create policy "Donos gerenciam seus relatórios" on public.market_reports
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "Donos gerenciam os mapas dos seus relatórios" on public.rank_grids
  for all to authenticated
  using (exists (
    select 1 from public.market_reports r
    where r.id = rank_grids.report_id and r.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.market_reports r
    where r.id = rank_grids.report_id and r.owner_id = (select auth.uid())
  ));

create policy "Donos gerenciam suas prospecções" on public.prospect_searches
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

revoke all on public.market_reports, public.rank_grids, public.prospect_searches from anon;
