-- Modelo escolhido no quiz (/comecar) para as placas e os cartões do kit.
-- Ids de src/lib/card.ts (PRODUCTS).
alter table public.leads
  add column plaque_model text check (plaque_model in ('placa-quadrada', 'placa-retangular')),
  add column card_model text check (card_model in ('cartao', 'cartao-vertical'));
