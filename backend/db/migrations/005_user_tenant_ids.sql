begin;

alter table public.menu_categories drop constraint if exists menu_categories_name_key;
alter table public.menu_categories drop constraint if exists menu_categories_tenant_name_key;
alter table public.dining_tables drop constraint if exists dining_tables_number_key;
alter table public.dining_tables drop constraint if exists dining_tables_tenant_number_key;

alter table public.restaurant_settings disable row level security;
alter table public.menu_categories disable row level security;
alter table public.dining_tables disable row level security;
alter table public.menu_items disable row level security;
alter table public.orders disable row level security;

delete from public.restaurant_settings settings
using (values
  ('tenant_owner_1', 'tenant_usr_owner_1'),
  ('tenant_owner_2', 'tenant_usr_owner_2'),
  ('tenant_owner_3', 'tenant_usr_owner_3')
) as tenants(old_id, new_id)
where settings.tenant_id = tenants.old_id
  and exists (
    select 1 from public.restaurant_settings existing
    where existing.tenant_id = tenants.new_id
  );

update public.restaurant_settings
set tenant_id = case tenant_id
  when 'tenant_owner_1' then 'tenant_usr_owner_1'
  when 'tenant_owner_2' then 'tenant_usr_owner_2'
  when 'tenant_owner_3' then 'tenant_usr_owner_3'
  else tenant_id end
where tenant_id in ('tenant_owner_1', 'tenant_owner_2', 'tenant_owner_3');

update public.menu_categories
set tenant_id = case tenant_id
  when 'tenant_owner_1' then 'tenant_usr_owner_1'
  when 'tenant_owner_2' then 'tenant_usr_owner_2'
  when 'tenant_owner_3' then 'tenant_usr_owner_3'
  else tenant_id end
where tenant_id in ('tenant_owner_1', 'tenant_owner_2', 'tenant_owner_3');

update public.dining_tables
set tenant_id = case tenant_id
  when 'tenant_owner_1' then 'tenant_usr_owner_1'
  when 'tenant_owner_2' then 'tenant_usr_owner_2'
  when 'tenant_owner_3' then 'tenant_usr_owner_3'
  else tenant_id end
where tenant_id in ('tenant_owner_1', 'tenant_owner_2', 'tenant_owner_3');

update public.menu_items
set tenant_id = case tenant_id
  when 'tenant_owner_1' then 'tenant_usr_owner_1'
  when 'tenant_owner_2' then 'tenant_usr_owner_2'
  when 'tenant_owner_3' then 'tenant_usr_owner_3'
  else tenant_id end
where tenant_id in ('tenant_owner_1', 'tenant_owner_2', 'tenant_owner_3');

update public.orders
set tenant_id = case tenant_id
  when 'tenant_owner_1' then 'tenant_usr_owner_1'
  when 'tenant_owner_2' then 'tenant_usr_owner_2'
  when 'tenant_owner_3' then 'tenant_usr_owner_3'
  else tenant_id end
where tenant_id in ('tenant_owner_1', 'tenant_owner_2', 'tenant_owner_3');

do $$
declare
  owner_row record;
begin
  for owner_row in
    select id, tenant_id
    from public.owner_users
    where id not in ('usr_owner_1', 'usr_owner_2', 'usr_owner_3')
      and tenant_id is not null
      and tenant_id <> ''
      and tenant_id not like 'tenant_owner_%'
      and (select count(*) from public.owner_users other
           where other.tenant_id = owner_users.tenant_id) = 1
  loop
    delete from public.restaurant_settings
    where tenant_id = owner_row.tenant_id
      and exists (
        select 1 from public.restaurant_settings existing
        where existing.tenant_id = 'tenant_' || owner_row.id
      );
    update public.restaurant_settings set tenant_id = 'tenant_' || owner_row.id where tenant_id = owner_row.tenant_id;
    update public.menu_categories set tenant_id = 'tenant_' || owner_row.id where tenant_id = owner_row.tenant_id;
    update public.dining_tables set tenant_id = 'tenant_' || owner_row.id where tenant_id = owner_row.tenant_id;
    update public.menu_items set tenant_id = 'tenant_' || owner_row.id where tenant_id = owner_row.tenant_id;
    update public.orders set tenant_id = 'tenant_' || owner_row.id where tenant_id = owner_row.tenant_id;
  end loop;
end $$;

update public.owner_users
set tenant_id = 'tenant_' || id;

alter table public.owner_users alter column tenant_id set not null;
alter table public.owner_users alter column tenant_id drop default;
alter table public.restaurant_settings alter column tenant_id drop default;
alter table public.menu_categories alter column tenant_id drop default;
alter table public.dining_tables alter column tenant_id drop default;
alter table public.menu_items alter column tenant_id drop default;
alter table public.orders alter column tenant_id drop default;

create unique index if not exists owner_users_tenant_id_key on public.owner_users (tenant_id);
alter table public.menu_categories
  add constraint menu_categories_tenant_name_key unique (tenant_id, name);
alter table public.dining_tables
  add constraint dining_tables_tenant_number_key unique (tenant_id, number);

alter table public.restaurant_settings enable row level security;
alter table public.menu_categories enable row level security;
alter table public.dining_tables enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;

alter table public.restaurant_settings force row level security;
alter table public.menu_categories force row level security;
alter table public.dining_tables force row level security;
alter table public.menu_items force row level security;
alter table public.orders force row level security;

commit;
