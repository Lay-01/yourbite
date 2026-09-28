begin;

-- Add tenant_id column to owner_users
alter table public.owner_users add column if not exists tenant_id text not null default 'tenant_owner_1';

-- Update restaurant_settings to support per-tenant settings
alter table public.restaurant_settings drop constraint if exists restaurant_settings_pkey;
alter table public.restaurant_settings add column if not exists tenant_id text default 'tenant_owner_1';
update public.restaurant_settings set tenant_id = 'tenant_owner_1' where tenant_id is null;
alter table public.restaurant_settings alter column tenant_id set not null;
alter table public.restaurant_settings add primary key (tenant_id);

-- Add tenant_id to menu_categories, dining_tables, menu_items, orders
alter table public.menu_categories add column if not exists tenant_id text not null default 'tenant_owner_1';
alter table public.dining_tables add column if not exists tenant_id text not null default 'tenant_owner_1';
alter table public.menu_items add column if not exists tenant_id text not null default 'tenant_owner_1';
alter table public.orders add column if not exists tenant_id text not null default 'tenant_owner_1';

-- Create tenant indexes for fast lookup
create index if not exists menu_categories_tenant_idx on public.menu_categories (tenant_id);
create index if not exists dining_tables_tenant_idx on public.dining_tables (tenant_id);
create index if not exists menu_items_tenant_idx on public.menu_items (tenant_id);
create index if not exists orders_tenant_date_idx on public.orders (tenant_id, created_at desc);

commit;
