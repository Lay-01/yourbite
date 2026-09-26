import pg from "pg";

const { Client } = pg;
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const client = new Client({ connectionString });

try {
  await client.connect();
  const [identity, columns, constraints, privileges, tables] = await Promise.all([
    client.query("select current_database() as database, current_user as role"),
    client.query(`
      select table_schema, table_name, column_name, data_type, is_nullable, column_default
      from information_schema.columns
      where table_schema not in ('pg_catalog', 'information_schema', 'neon_auth')
      order by table_schema, table_name, ordinal_position
    `),
    client.query(`
      select tc.table_schema, tc.table_name, tc.constraint_name, tc.constraint_type,
             kcu.column_name, ccu.table_name as foreign_table_name,
             ccu.column_name as foreign_column_name
      from information_schema.table_constraints tc
      left join information_schema.key_column_usage kcu
        on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
      left join information_schema.constraint_column_usage ccu
        on ccu.constraint_name = tc.constraint_name and ccu.table_schema = tc.table_schema
      where tc.table_schema not in ('pg_catalog', 'information_schema', 'neon_auth')
        and tc.constraint_type in ('PRIMARY KEY', 'UNIQUE', 'FOREIGN KEY')
      order by tc.table_schema, tc.table_name, tc.constraint_name
    `),
    client.query(`
      select table_schema, table_name,
        has_table_privilege(format('%I.%I', table_schema, table_name), 'select') as can_select,
        has_table_privilege(format('%I.%I', table_schema, table_name), 'insert') as can_insert,
        has_table_privilege(format('%I.%I', table_schema, table_name), 'update') as can_update,
        has_table_privilege(format('%I.%I', table_schema, table_name), 'delete') as can_delete
      from information_schema.tables
      where table_schema not in ('pg_catalog', 'information_schema', 'neon_auth')
      order by table_schema, table_name
    `),
    client.query(`
      select schemaname as table_schema, tablename as table_name
      from pg_tables
      where schemaname not in ('pg_catalog', 'information_schema', 'neon_auth')
      order by schemaname, tablename
    `),
  ]);

  const tableSummaries = await Promise.all(tables.rows.map(async ({ table_schema, table_name }) => {
    const quote = (identifier) => `"${identifier.replaceAll('"', '""')}"`;
    const result = await client.query(
      `select count(*)::bigint as row_count from ${quote(table_schema)}.${quote(table_name)}`
    );
    return { table_schema, table_name, row_count: Number(result.rows[0].row_count) };
  }));

  console.log(JSON.stringify({
    database: identity.rows[0],
    columns: columns.rows,
    constraints: constraints.rows,
    privileges: privileges.rows,
    tables: tableSummaries,
  }, null, 2));
} catch (error) {
  console.error("Database schema inspection failed:", error.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}