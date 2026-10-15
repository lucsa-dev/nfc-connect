-- Prospecção "perto de mim": a busca é feita num círculo ao redor da
-- localização do vendedor. Sem centro, continua a busca por "termo em região".
alter table public.prospect_searches
  add column center_lat double precision check (center_lat between -90 and 90),
  add column center_lng double precision check (center_lng between -180 and 180),
  add column radius_m integer check (radius_m between 100 and 20000);
