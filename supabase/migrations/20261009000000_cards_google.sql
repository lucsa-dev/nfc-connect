-- Lotes de peças em branco (cartões e placas) e métricas do Google Maps.
--
-- Fluxo: o administrador gera um lote; cada peça ganha um código curto que vai
-- no QR Code e no chip NFC (/c/{codigo}). Quem abrir uma peça em branco ativa:
-- escolhe o negócio no Google, e o sistema cria o negócio (ou reaproveita o
-- mesmo Place ID) e um link de avaliação só daquela peça.

-- Negócios: vínculo com o Google ------------------------------------------------
alter table public.businesses add column place_id text check (char_length(place_id) <= 300);
-- Como achar o negócio no Google Maps quando ainda não há Place ID ("Nome, Cidade - UF").
-- O scraper (Apify) busca por este texto e grava o place_id encontrado.
alter table public.businesses add column maps_query text check (char_length(maps_query) <= 200);

create unique index businesses_owner_place_idx on public.businesses (owner_id, place_id)
  where place_id is not null;

grant update (place_id, maps_query) on public.businesses to authenticated;

-- Lotes ------------------------------------------------------------------------
create table public.card_batches (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  -- Ids de src/lib/card.ts (PRODUCTS e STYLES)
  product text not null,
  style text not null,
  quantity integer not null check (quantity between 1 and 500),
  created_at timestamptz not null default now()
);

create index card_batches_owner_idx on public.card_batches (owner_id, created_at desc);

-- Peças --------------------------------------------------------------------------
create table public.cards (
  id uuid primary key default gen_random_uuid(),
  -- Sem 0/1/i/l/o, para não confundir ao ler impresso.
  code text not null unique check (code ~ '^[2-9a-hjkmnp-z]{8}$'),
  batch_id uuid not null references public.card_batches (id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Ordem de impressão dentro do lote (1..quantity)
  position integer not null check (position >= 1),
  -- Sem link = em branco. Se o negócio for excluído, a peça volta a ficar livre.
  link_id uuid unique references public.links (id) on delete set null,
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  unique (batch_id, position)
);

create index cards_owner_idx on public.cards (owner_id);

-- Fotografias do perfil no Google ----------------------------------------------
-- Uma linha por coleta (ativação, botão "Atualizar" ou cron semanal), vinda do
-- scraper da Apify ou da Google Places API.
create table public.place_snapshots (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses (id) on delete cascade,
  place_id text not null,
  created_at timestamptz not null default now(),
  rating numeric(2, 1),
  reviews integer,
  -- Perfil completo (src/lib/places.ts: PlaceProfile)
  profile jsonb not null default '{}',
  -- Análise da IA (src/lib/google-analysis.ts: Analysis)
  analysis jsonb,
  analyzed_at timestamptz
);

create index place_snapshots_business_created_idx on public.place_snapshots (business_id, created_at desc);
create index place_snapshots_created_idx on public.place_snapshots (created_at desc);

-- RLS --------------------------------------------------------------------------
-- A ativação pública e o cron usam a chave secreta (ignoram RLS).
alter table public.card_batches enable row level security;
alter table public.cards enable row level security;
alter table public.place_snapshots enable row level security;

create policy "Donos gerenciam seus lotes" on public.card_batches
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "Donos gerenciam suas peças" on public.cards
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "Donos gerenciam dados do Google dos seus negócios" on public.place_snapshots
  for all to authenticated
  using (exists (
    select 1 from public.businesses b
    where b.id = place_snapshots.business_id and b.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.businesses b
    where b.id = place_snapshots.business_id and b.owner_id = (select auth.uid())
  ));

revoke all on public.card_batches, public.cards, public.place_snapshots from anon;
