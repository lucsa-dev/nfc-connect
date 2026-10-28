-- Clientes em prospecção: negócios tirados de uma busca (prospect_searches)
-- para contato um a um pelo WhatsApp, com os dados da proposta comercial.
create table public.prospects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  search_id uuid references public.prospect_searches (id) on delete set null,
  place_id text not null check (char_length(place_id) between 10 and 300),
  name text not null check (char_length(name) between 1 and 200),
  -- Negócio como veio da busca (src/lib/market.ts: Prospect), para a proposta
  data jsonb not null default '{}',
  status text not null default 'novo'
    check (status in ('novo', 'enviado', 'conversando', 'fechado', 'perdido')),
  contact_name text check (char_length(contact_name) <= 80),
  -- Telefone como digitado ou como veio do Google ("(85) 99999-9999")
  phone text check (char_length(phone) <= 40),
  email text check (char_length(email) <= 200),
  instagram text check (char_length(instagram) <= 80),
  website text check (char_length(website) <= 300),
  -- Preço da proposta em centavos (null: proposta sem valor)
  price_cents integer check (price_cents between 0 and 10000000),
  -- Texto livre que aparece na proposta
  proposal_note text check (char_length(proposal_note) <= 1000),
  -- Anotações internas do vendedor (não vão para a proposta)
  notes text check (char_length(notes) <= 2000),
  contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, place_id)
);

create index prospects_owner_idx on public.prospects (owner_id, updated_at desc);

alter table public.prospects enable row level security;

create policy "Donos gerenciam seus clientes em prospecção" on public.prospects
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

revoke all on public.prospects from anon;

create trigger prospects_updated_at before update on public.prospects
  for each row execute function public.set_updated_at();
