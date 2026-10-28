-- Pagamento do pedido do quiz (/comecar) pelo Checkout PagBank.
--
-- O servidor cria o checkout com o valor do lead (total_cents) e guarda o id;
-- o webhook do PagBank (/api/pagbank) marca o pedido como pago.
alter table public.leads add column payment_status text
  check (payment_status in ('pendente', 'pago', 'recusado'));
alter table public.leads add column checkout_id text check (char_length(checkout_id) <= 64);
alter table public.leads add column paid_at timestamptz;

create index leads_checkout_idx on public.leads (checkout_id) where checkout_id is not null;
