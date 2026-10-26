-- Plano do cliente e relatório mensal.
--
-- A peça vale por um ano a partir da ativação (plan_expires_at). Enquanto o
-- plano estiver valendo, o cron /api/cron/relatorios gera um relatório de
-- concorrência novo a cada 30 dias, com a mesma busca do último, formando o
-- histórico mensal do cliente.
alter table public.businesses add column plan_expires_at timestamptz;

-- Negócios com peças já ativadas: um ano a partir da primeira ativação.
update public.businesses b
set plan_expires_at = c.first_activation + interval '1 year'
from (
  select business_id, min(activated_at) as first_activation
  from public.cards
  where business_id is not null and activated_at is not null
  group by business_id
) c
where c.business_id = b.id;

-- Relatórios feitos na prospecção, antes do cadastro, passam a ser do cliente.
update public.market_reports r
set business_id = b.id
from public.businesses b
where r.business_id is null and b.place_id = r.place_id and b.plan_expires_at is not null;

create index businesses_plan_idx on public.businesses (plan_expires_at) where plan_expires_at is not null;
