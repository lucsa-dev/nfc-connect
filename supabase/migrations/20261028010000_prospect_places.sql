-- Prospecção pela Places API (mais barata que o scraper): a busca termina na
-- hora, mas o conteúdo da Places API só pode ficar guardado por 30 dias.
-- O cron diário apaga as buscas vencidas (os clientes da lista ficam).
alter table public.prospect_searches
  add column expires_at timestamptz;

create index prospect_searches_expires_idx on public.prospect_searches (expires_at) where expires_at is not null;
