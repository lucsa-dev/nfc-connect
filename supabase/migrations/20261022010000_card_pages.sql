-- Peças com vários links e página do negócio.
--
-- Antes: cada peça tinha um link de avaliação só dela (cards.link_id).
-- Agora: os links são do negócio e a peça só aponta para o negócio. Ao abrir:
-- - "direto" (direct_link_id): vai sempre para aquele link;
-- - automático (direct_link_id vazio): com 1 link ativo vai direto para ele,
--   com mais de um abre a página do negócio (/{negocio}) com todos.
-- Se o negócio for excluído, a peça volta a ficar em branco (on delete set null).

alter table public.cards
  add column business_id uuid references public.businesses (id) on delete set null,
  add column direct_link_id uuid,
  -- Acessos humanos à peça (redirecionamentos e aberturas da página), via gatilho.
  add column visit_count bigint not null default 0;

-- O link fixado tem que ser do mesmo negócio da peça. Se o link for excluído,
-- só direct_link_id volta a vazio (a peça fica no automático).
alter table public.links add constraint links_id_business_key unique (id, business_id);
alter table public.cards
  add constraint cards_direct_link_fkey foreign key (direct_link_id, business_id)
  references public.links (id, business_id) on delete set null (direct_link_id);

-- Ao excluir o negócio, business_id vira vazio antes de os links serem
-- apagados, e a chave composta deixa de enxergar a peça: limpa aqui.
create function public.clear_card_direct_link() returns trigger
language plpgsql as $$
begin
  if new.business_id is null then
    new.direct_link_id = null;
  end if;
  return new;
end;
$$;

create trigger cards_clear_direct_link before update of business_id on public.cards
  for each row execute function public.clear_card_direct_link();

create index cards_business_idx on public.cards (business_id) where business_id is not null;

-- Acessos: a abertura da página do negócio não tem link; o da peça, sim.
alter table public.link_visits
  alter column link_id drop not null,
  add column card_id uuid references public.cards (id) on delete set null;

create index link_visits_card_created_idx on public.link_visits (card_id, created_at desc)
  where card_id is not null;

-- Peças já ativadas -------------------------------------------------------------
-- Continuam indo direto para o link de avaliação de hoje (estão impressas como
-- "Avalie sua experiência"), mesmo que o negócio ganhe outros links.
update public.cards c
set business_id = l.business_id, direct_link_id = l.id
from public.links l
where l.id = c.link_id;

update public.link_visits v
set card_id = c.id
from public.cards c
where c.link_id = v.link_id;

update public.cards c
set visit_count = (select count(*) from public.link_visits v where v.card_id = c.id and not v.is_bot)
where c.business_id is not null;

-- Cada peça do mesmo kit criou um link igual (mesmo negócio e destino).
-- Junta todos no mais antigo, com acessos e contagem somados.
create temporary table link_merge as
select l.id, first_value(l.id) over (partition by l.business_id, l.url order by l.created_at, l.id) as keep_id
from public.links l
where exists (select 1 from public.cards c where c.link_id = l.id);

update public.links l
set click_count = t.total
from (
  select m.keep_id, sum(d.click_count) as total
  from link_merge m join public.links d on d.id = m.id
  group by m.keep_id
) t
where l.id = t.keep_id;

update public.link_visits v set link_id = m.keep_id
from link_merge m where v.link_id = m.id and m.id <> m.keep_id;

update public.cards c set direct_link_id = m.keep_id
from link_merge m where c.direct_link_id = m.id and m.id <> m.keep_id;

alter table public.cards drop column link_id;

delete from public.links l using link_merge m where l.id = m.id and m.id <> m.keep_id;

-- O nome era o da primeira peça ("Placa k7m2p9qa"). O endereço fica igual.
update public.links set name = 'Avaliação no Google'
where type = 'review' and id in (select keep_id from link_merge);

drop table link_merge;

-- O painel só escolhe o link fixado; o resto é da ativação e dos gatilhos.
revoke update on public.cards from authenticated, anon;
grant update (direct_link_id) on public.cards to authenticated;

-- Contadores ---------------------------------------------------------------------
create or replace function public.increment_link_click_count() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not new.is_bot then
    if new.link_id is not null then
      update public.links set click_count = click_count + 1 where id = new.link_id;
    end if;
    if new.card_id is not null then
      update public.cards set visit_count = visit_count + 1 where id = new.card_id;
    end if;
  end if;
  return new;
end;
$$;
