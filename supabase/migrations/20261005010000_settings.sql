-- Configurações do site (linha única), editadas no painel.
create table public.site_settings (
  id boolean primary key default true check (id),
  whatsapp text check (whatsapp ~ '^\+55\d{10,11}$'),
  updated_at timestamptz not null default now()
);

create trigger site_settings_updated_at before update on public.site_settings
  for each row execute function public.set_updated_at();

alter table public.site_settings enable row level security;

-- O site lê pelo servidor (chave secreta); administradores logados leem e editam.
create policy "Administradores gerenciam configurações" on public.site_settings
  for all to authenticated using (true) with check (true);

revoke all on public.site_settings from anon;

insert into public.site_settings (id, whatsapp) values (true, '+5585982078212');
