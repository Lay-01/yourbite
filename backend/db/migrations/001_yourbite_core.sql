begin;

create table if not exists public.restaurant_settings (
  singleton boolean primary key default true check (singleton),
  cafe_name text not null default 'Your Restaurant',
  tax_rate numeric(5, 2) not null default 0 check (tax_rate >= 0 and tax_rate <= 100),
  opening_hours text not null default ''
);

create table if not exists public.menu_categories (
  id text primary key,
  name text not null unique,
  sort_order integer not null default 0
);

create table if not exists public.dining_tables (
  id text primary key,
  number text not null unique,
  seats integer not null default 4 check (seats > 0),
  active boolean not null default true,
  claimed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.menu_items (
  id text primary key,
  name text not null,
  description text not null default '',
  category_id text not null references public.menu_categories(id) on update cascade on delete restrict,
  price numeric(12, 2) not null check (price >= 0),
  emoji text not null default '',
  image text not null default '',
  veg boolean not null default true,
  available boolean not null default true,
  bestseller boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id bigint primary key,
  table_id text references public.dining_tables(id) on update cascade on delete set null,
  table_number text not null,
  note text not null default '',
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  status text not null check (status in ('new', 'accepted', 'preparing', 'ready', 'served', 'completed', 'cancelled')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed')),
  payment_method text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  paid_at timestamptz
);

create table if not exists public.order_items (
  order_id bigint not null references public.orders(id) on delete cascade,
  line_number integer not null,
  item_id text references public.menu_items(id) on update cascade on delete set null,
  name text not null,
  price numeric(12, 2) not null check (price >= 0),
  qty integer not null check (qty > 0),
  veg boolean not null default true,
  primary key (order_id, line_number)
);

create table if not exists public.order_status_events (
  order_id bigint not null references public.orders(id) on delete cascade,
  sequence integer not null,
  status text not null,
  label text not null,
  created_at timestamptz not null,
  primary key (order_id, sequence)
);

create table if not exists public.payments (
  id bigint generated always as identity primary key,
  order_id bigint not null unique references public.orders(id) on delete cascade,
  amount numeric(12, 2) not null check (amount >= 0),
  method text,
  status text not null check (status in ('pending', 'paid', 'failed')),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_status_payment_idx on public.orders (status, payment_status);
create index if not exists orders_table_id_idx on public.orders (table_id, created_at desc);
create index if not exists menu_items_category_available_idx on public.menu_items (category_id, available);
create index if not exists order_status_events_created_at_idx on public.order_status_events (created_at);

insert into public.restaurant_settings (singleton)
values (true)
on conflict (singleton) do nothing;

commit;