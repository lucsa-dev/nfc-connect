-- Acesso do cliente: complementa 20261022030000_client_access.sql.

-- A ativação da peça cadastra o dono pelo e-mail. Se ele já tem login, a
-- Server Action (chave secreta) precisa do id: auth.users não passa pela API.
create function public.user_id_by_email(target text) returns uuid
language sql stable security definer set search_path = '' as $$
  select id from auth.users where lower(email) = lower(target) limit 1;
$$;

revoke execute on function public.user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.user_id_by_email(text) to service_role;

-- O cliente vê o histórico de relatórios prontos dos seus negócios (/conta).
create policy "Membros veem os relatórios dos seus negócios" on public.market_reports
  for select to authenticated
  using (business_id is not null and status = 'ready' and public.is_member(business_id));
