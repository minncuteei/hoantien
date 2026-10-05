-- Roles
create type public.app_role as enum ('admin','user');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  payout_method text default 'momo',
  payout_account text,
  payout_holder text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select to authenticated using (id = auth.uid());
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid());

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles select" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- Platforms / cashback rates (public read)
create table public.platforms (
  slug text primary key,
  name text not null,
  cashback_rate numeric(5,2) not null default 5,
  affiliate_param text,
  affiliate_value text,
  enabled boolean not null default true,
  sort_order int not null default 0
);
grant select on public.platforms to anon, authenticated;
grant all on public.platforms to service_role;
alter table public.platforms enable row level security;
create policy "platforms public read" on public.platforms for select to anon, authenticated using (true);
create policy "platforms admin write" on public.platforms for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

insert into public.platforms (slug,name,cashback_rate,affiliate_param,affiliate_value,sort_order) values
  ('shopee','Shopee',12,'af_id','',1),
  ('tiktok','TikTok Shop',10,'aff_id','',2),
  ('lazada','Lazada',9,'sub_aff_id','',3),
  ('tiki','Tiki',7,'utm_content','',4);

-- Converted links
create table public.links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  original_url text not null,
  affiliate_url text not null,
  short_code text not null unique,
  platform text not null references public.platforms(slug),
  title text,
  clicks int not null default 0,
  created_at timestamptz not null default now()
);
create index links_user_idx on public.links(user_id, created_at desc);
grant select, insert, update, delete on public.links to authenticated;
grant all on public.links to service_role;
alter table public.links enable row level security;
create policy "own links" on public.links for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "admin read links" on public.links for select to authenticated
  using (public.has_role(auth.uid(),'admin'));

-- Orders / commissions
create type public.order_status as enum ('pending','confirmed','rejected','paid');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  link_id uuid references public.links(id) on delete set null,
  platform text not null references public.platforms(slug),
  product_name text not null,
  order_amount numeric(14,2) not null default 0,
  commission numeric(14,2) not null default 0,
  status public.order_status not null default 'pending',
  created_at timestamptz not null default now()
);
create index orders_user_idx on public.orders(user_id, created_at desc);
grant select on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "own orders" on public.orders for select to authenticated using (user_id = auth.uid());
create policy "admin all orders" on public.orders for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- Withdrawals
create type public.withdrawal_status as enum ('pending','approved','rejected');

create table public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  method text not null default 'momo',
  account text not null,
  holder text,
  status public.withdrawal_status not null default 'pending',
  note text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create index withdrawals_user_idx on public.withdrawals(user_id, created_at desc);
grant select, insert on public.withdrawals to authenticated;
grant all on public.withdrawals to service_role;
alter table public.withdrawals enable row level security;
create policy "own withdrawals select" on public.withdrawals for select to authenticated using (user_id = auth.uid());
create policy "own withdrawals insert" on public.withdrawals for insert to authenticated with check (user_id = auth.uid());
create policy "admin all withdrawals" on public.withdrawals for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- Auto profile + default role on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'user')
  on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Wallet summary
create or replace function public.wallet_summary(_user_id uuid)
returns table (confirmed numeric, pending numeric, withdrawn numeric, locked numeric, available numeric)
language sql stable security definer set search_path = public as $$
  select
    coalesce((select sum(commission) from public.orders where user_id=_user_id and status in ('confirmed','paid')),0),
    coalesce((select sum(commission) from public.orders where user_id=_user_id and status='pending'),0),
    coalesce((select sum(amount) from public.withdrawals where user_id=_user_id and status='approved'),0),
    coalesce((select sum(amount) from public.withdrawals where user_id=_user_id and status='pending'),0),
    coalesce((select sum(commission) from public.orders where user_id=_user_id and status in ('confirmed','paid')),0)
      - coalesce((select sum(amount) from public.withdrawals where user_id=_user_id and status in ('approved','pending')),0)
$$;
