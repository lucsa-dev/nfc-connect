-- Tipo de link Wi-Fi. Fica sozinho nesta migração: um valor novo de enum só
-- pode ser usado depois que a transação que o criou termina.
alter type public.link_type add value if not exists 'wifi';
