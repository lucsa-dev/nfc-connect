-- Acesso do cliente (dono do negócio) com link mágico por e-mail.
--
-- Até aqui todo usuário logado era administrador. Agora há dois papéis:
-- - administrador (public.admins): o painel /dashboard, como antes;
-- - membro de um negócio (public.business_members): a área /conta, onde vê e
--   edita só os negócios dele (links, destino das peças e Pixel).
--
-- O cliente lê pelo RLS abaixo; as alterações dele passam por Server Actions
-- que conferem a participação e usam a chave secreta, para controlar quais
-- colunas ele pode mudar.

-- Administradores ------------------------------------------------------------------
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Quem já tinha login até agora era administrador.
insert into public.admins (user_id) select id from auth.users;

alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

-- Membros dos negócios ----------------------------------------------------------------
-- pending: pediu acesso a um negócio que já tem membro; o administrador aprova.
create table public.business_members (
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  email text not null check (char_length(email) <= 320),
  phone text check (phone ~ '^\+55\d{10,11}$'),
  status text not null default 'active' check (status in ('active', 'pending')),
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);

create index business_members_user_idx on public.business_members (user_id);

create function public.is_member(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.business_members
    where business_id = target and user_id = (select auth.uid()) and status = 'active'
  );
$$;

alter table public.business_members enable row level security;

create policy "Donos gerenciam membros dos seus negócios" on public.business_members
  for all to authenticated
  using (exists (
    select 1 from public.businesses b
    where b.id = business_members.business_id and b.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.businesses b
    where b.id = business_members.business_id and b.owner_id = (select auth.uid())
  ));

create policy "Membros veem a própria participação" on public.business_members
  for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.business_members from anon;

-- Leitura do cliente -------------------------------------------------------------------
create policy "Membros veem seus negócios" on public.businesses
  for select to authenticated using (public.is_member(id));

create policy "Membros veem links dos seus negócios" on public.links
  for select to authenticated using (public.is_member(business_id));

create policy "Membros veem as peças dos seus negócios" on public.cards
  for select to authenticated using (business_id is not null and public.is_member(business_id));

create policy "Membros veem os lotes das suas peças" on public.card_batches
  for select to authenticated using (exists (
    select 1 from public.cards c
    where c.batch_id = card_batches.id and c.business_id is not null and public.is_member(c.business_id)
  ));

create policy "Membros veem acessos dos seus negócios" on public.link_visits
  for select to authenticated using (public.is_member(business_id));

-- Só administradores -------------------------------------------------------------------
-- Estas políticas liberavam tudo para qualquer usuário logado.
drop policy "Administradores gerenciam leads" on public.leads;
create policy "Administradores gerenciam leads" on public.leads
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy "Administradores gerenciam configurações" on public.site_settings;
create policy "Administradores gerenciam configurações" on public.site_settings
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- As políticas de "dono" deixavam qualquer usuário logado criar negócios,
-- lotes e relatórios em nome próprio. Escrever exige ser administrador; ler
-- continua pelas políticas de dono/membro.
do $$
declare
  t text;
  cmd text;
begin
  foreach t in array array[
    'businesses', 'links', 'card_batches', 'cards', 'place_snapshots',
    'market_reports', 'rank_grids', 'prospect_searches'
  ] loop
    foreach cmd in array array['insert', 'update', 'delete'] loop
      execute format(
        'create policy %I on public.%I as restrictive for %s to authenticated %s',
        'Só administradores alteram (' || cmd || ')', t, cmd,
        case cmd
          when 'insert' then 'with check ((select public.is_admin()))'
          when 'update' then 'using ((select public.is_admin())) with check ((select public.is_admin()))'
          else 'using ((select public.is_admin()))'
        end
      );
    end loop;
  end loop;
end;
$$;
