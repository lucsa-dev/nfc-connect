-- Buscas de negócio no Google Maps feitas no quiz (/comecar) pelo scraper da Apify.
-- Serve de cache (a mesma busca não roda de novo) e de limite por visitante,
-- já que cada execução do scraper é cobrada. Só o servidor (chave secreta) acessa.
create table public.maps_searches (
  id bigint generated always as identity primary key,
  -- Texto normalizado (minúsculas, sem acento e espaços extras)
  query text not null check (char_length(query) between 3 and 200),
  ip_hash text,
  -- PlaceProfile[] encontrados (até 3)
  results jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create index maps_searches_query_idx on public.maps_searches (query, created_at desc);
create index maps_searches_ip_idx on public.maps_searches (ip_hash, created_at desc);

alter table public.maps_searches enable row level security;
revoke all on public.maps_searches from anon, authenticated;
