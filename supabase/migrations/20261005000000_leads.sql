-- Leads do quiz de vendas (/comecar).
-- Gravados pelo servidor com a chave secreta (o visitante não tem login);
-- o painel lê e atualiza com a sessão do administrador.

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  -- Identificador gerado no navegador para retomar e atualizar o mesmo lead.
  session_id uuid not null unique,
  status text not null default 'quiz' check (status in ('quiz', 'lead', 'convertido', 'descartado')),
  step text,
  -- Negócio (Google Places)
  place_id text,
  place_name text check (char_length(place_name) <= 200),
  place_address text,
  place_city text,
  place_state text,
  place_rating numeric(2, 1),
  place_reviews integer,
  place_category text,
  place_maps_url text,
  place_last_review_at timestamptz,
  -- Respostas
  goal integer check (goal >= 0),
  spots text[] not null default '{}',
  clients_band text,
  counters integer check (counters between 0 and 100),
  tables integer check (tables between 0 and 500),
  style text,
  plaques integer check (plaques >= 0),
  cards integer check (cards >= 0),
  total_cents integer check (total_cents >= 0),
  estimate text,
  -- Contato
  contact_name text check (char_length(contact_name) <= 120),
  whatsapp text check (whatsapp ~ '^\+55\d{10,11}$'),
  marketing_consent boolean not null default false,
  utm jsonb not null default '{}',
  -- Conversão
  business_id uuid references public.businesses (id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_status_updated_idx on public.leads (status, updated_at desc);

create trigger leads_updated_at before update on public.leads
  for each row execute function public.set_updated_at();

alter table public.leads enable row level security;

-- Administradores (qualquer usuário logado) gerenciam os leads.
create policy "Administradores gerenciam leads" on public.leads
  for all to authenticated using (true) with check (true);

revoke all on public.leads from anon;
