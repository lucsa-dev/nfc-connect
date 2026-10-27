-- O cliente vê na /conta a análise do perfil do Google feita pela IA.
create policy "Membros veem os dados do Google dos seus negócios" on public.place_snapshots
  for select to authenticated
  using (public.is_member(business_id));
