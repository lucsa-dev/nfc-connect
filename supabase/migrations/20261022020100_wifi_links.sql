-- Link Wi-Fi: o navegador não consegue conectar o celular a uma rede, então o
-- link abre uma página com o nome da rede e a senha para copiar
-- (/{negocio}/{link}/wifi). Sem senha = rede aberta.
alter table public.links
  add column wifi_ssid text check (char_length(wifi_ssid) between 1 and 32),
  add column wifi_password text check (char_length(wifi_password) <= 63);

-- type::text: compara sem depender do valor novo do enum.
alter table public.links drop constraint links_destination_check;
alter table public.links add constraint links_destination_check check (
  url is not null
  or (type::text = 'pix' and pix_key is not null and pix_name is not null and pix_city is not null)
  or (type::text = 'wifi' and wifi_ssid is not null)
);

grant update (wifi_ssid, wifi_password) on public.links to authenticated;
