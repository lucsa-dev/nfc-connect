-- NFC Connect: negócios, links (TAG NFC + QR Code) e acessos.

create type public.link_type as enum ('review', 'pix', 'business_card', 'other');

-- Negócios ---------------------------------------------------------------
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  -- Primeiro segmento da URL pública: único no sistema todo.
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 2 and 60),
  description text check (char_length(description) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index businesses_owner_idx on public.businesses (owner_id);

-- Links ------------------------------------------------------------------
create table public.links (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  slug text not null
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 2 and 60),
  type public.link_type not null default 'other',
  url text check (url ~* '^https?://'),
  is_active boolean not null default true,
  click_count bigint not null default 0,
  -- Pix estático (usado quando não há URL de pagamento)
  pix_key text check (char_length(pix_key) <= 77),
  pix_name text check (char_length(pix_name) <= 25),
  pix_city text check (char_length(pix_city) <= 15),
  pix_amount numeric(9, 2) check (pix_amount > 0),
  pix_description text check (char_length(pix_description) <= 50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, slug),
  constraint links_destination_check check (
    url is not null
    or (type = 'pix' and pix_key is not null and pix_name is not null and pix_city is not null)
  )
);

create index links_business_idx on public.links (business_id);

-- Acessos ----------------------------------------------------------------
create table public.link_visits (
  id bigint generated always as identity primary key,
  link_id uuid not null references public.links (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  created_at timestamptz not null default now(),
  source text not null default 'nfc' check (source in ('nfc', 'qr')),
  ip_hash text,
  user_agent text,
  browser text,
  browser_version text,
  os text,
  os_version text,
  device_type text,
  device_vendor text,
  is_bot boolean not null default false,
  language text,
  referer text,
  country text,
  region text,
  city text,
  latitude double precision,
  longitude double precision
);

create index link_visits_link_created_idx on public.link_visits (link_id, created_at desc);
create index link_visits_business_created_idx on public.link_visits (business_id, created_at desc);

-- Gatilhos ---------------------------------------------------------------
create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger businesses_updated_at before update on public.businesses
  for each row execute function public.set_updated_at();
create trigger links_updated_at before update on public.links
  for each row execute function public.set_updated_at();

-- Contador atômico: cada acesso humano incrementa links.click_count.
create function public.increment_link_click_count() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not new.is_bot then
    update public.links set click_count = click_count + 1 where id = new.link_id;
  end if;
  return new;
end;
$$;

create trigger link_visits_increment after insert on public.link_visits
  for each row execute function public.increment_link_click_count();

-- RLS --------------------------------------------------------------------
-- Painel: cada administrador só vê e altera os próprios negócios.
-- O redirecionamento público usa a chave secreta (service role) no servidor,
-- que ignora RLS; por isso não há política para o papel "anon".
alter table public.businesses enable row level security;
alter table public.links enable row level security;
alter table public.link_visits enable row level security;

create policy "Donos gerenciam seus negócios" on public.businesses
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "Donos gerenciam links dos seus negócios" on public.links
  for all to authenticated
  using (exists (
    select 1 from public.businesses b
    where b.id = links.business_id and b.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.businesses b
    where b.id = links.business_id and b.owner_id = (select auth.uid())
  ));

create policy "Donos leem acessos dos seus negócios" on public.link_visits
  for select to authenticated
  using (exists (
    select 1 from public.businesses b
    where b.id = link_visits.business_id and b.owner_id = (select auth.uid())
  ));

-- O contador só é alterado pelo gatilho e o link não muda de negócio:
-- o painel só pode atualizar as colunas editáveis.
revoke update on public.links from authenticated, anon;
grant update (
  name, slug, type, url, is_active,
  pix_key, pix_name, pix_city, pix_amount, pix_description
) on public.links to authenticated;

revoke update on public.businesses from authenticated, anon;
grant update (name, slug, description) on public.businesses to authenticated;

revoke insert, update, delete on public.link_visits from authenticated, anon;
