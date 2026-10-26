-- Adesivos QR do pedido. O serviço é por estabelecimento: 1 placa no balcão e
-- adesivos impressos (Niimbot) pelo ambiente, 5 inclusos. Pedidos antigos
-- continuam com placas/cartões e ficam com stickers vazio.
alter table public.leads add column stickers integer check (stickers >= 0);
