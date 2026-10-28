begin;

alter table public.menu_categories drop constraint if exists menu_categories_name_key;
alter table public.menu_categories
  add constraint menu_categories_tenant_name_key unique (tenant_id, name);

alter table public.dining_tables drop constraint if exists dining_tables_number_key;
alter table public.dining_tables
  add constraint dining_tables_tenant_number_key unique (tenant_id, number);

create index if not exists restaurant_settings_tenant_idx on public.restaurant_settings (tenant_id);

create sequence if not exists public.orders_id_seq;
select setval(
  'public.orders_id_seq',
  coalesce((select max(id) from public.orders), 0) + 1,
  false
);
alter table public.orders alter column id set default nextval('public.orders_id_seq');

alter table public.restaurant_settings enable row level security;
alter table public.menu_categories enable row level security;
alter table public.dining_tables enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_events enable row level security;
alter table public.payments enable row level security;

alter table public.restaurant_settings force row level security;
alter table public.menu_categories force row level security;
alter table public.dining_tables force row level security;
alter table public.menu_items force row level security;
alter table public.orders force row level security;
alter table public.order_items force row level security;
alter table public.order_status_events force row level security;
alter table public.payments force row level security;

create policy tenant_isolation on public.restaurant_settings
  using (tenant_id = current_setting('app.tenant_id', true))
  with check (tenant_id = current_setting('app.tenant_id', true));
create policy tenant_isolation on public.menu_categories
  using (tenant_id = current_setting('app.tenant_id', true))
  with check (tenant_id = current_setting('app.tenant_id', true));
create policy tenant_isolation on public.dining_tables
  using (tenant_id = current_setting('app.tenant_id', true))
  with check (tenant_id = current_setting('app.tenant_id', true));
create policy tenant_isolation on public.menu_items
  using (tenant_id = current_setting('app.tenant_id', true))
  with check (tenant_id = current_setting('app.tenant_id', true));
create policy tenant_isolation on public.orders
  using (tenant_id = current_setting('app.tenant_id', true))
  with check (tenant_id = current_setting('app.tenant_id', true));
create policy tenant_isolation on public.order_items
  using (order_id in (
    select id from public.orders
    where tenant_id = current_setting('app.tenant_id', true)
  ))
  with check (order_id in (
    select id from public.orders
    where tenant_id = current_setting('app.tenant_id', true)
  ));
create policy tenant_isolation on public.order_status_events
  using (order_id in (
    select id from public.orders
    where tenant_id = current_setting('app.tenant_id', true)
  ))
  with check (order_id in (
    select id from public.orders
    where tenant_id = current_setting('app.tenant_id', true)
  ));
create policy tenant_isolation on public.payments
  using (order_id in (
    select id from public.orders
    where tenant_id = current_setting('app.tenant_id', true)
  ))
  with check (order_id in (
    select id from public.orders
    where tenant_id = current_setting('app.tenant_id', true)
  ));

commit;
