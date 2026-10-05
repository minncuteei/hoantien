create policy "admin read profiles" on public.profiles for select to authenticated
  using (public.has_role(auth.uid(),'admin'));