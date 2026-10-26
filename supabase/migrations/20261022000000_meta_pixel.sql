-- Pixel do Meta do cliente. Com ele configurado, os links do negócio passam
-- por uma página rápida que dispara o Pixel antes de redirecionar, formando um
-- público de quem esteve na loja. O Pixel é do cliente (não nosso): o público
-- fica na conta de anúncios dele.
alter table public.businesses
  add column meta_pixel_id text check (meta_pixel_id ~ '^[0-9]{10,20}$');

-- O painel só atualiza colunas liberadas uma a uma (ver init.sql).
grant update (meta_pixel_id) on public.businesses to authenticated;
