begin;

create table if not exists public.owner_users (
  id text primary key,
  email text not null unique,
  password_hash text not null,
  password_salt text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.owner_sessions (
  token text primary key,
  user_id text not null references public.owner_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists owner_users_email_idx on public.owner_users (lower(email));
create index if not exists owner_sessions_expires_idx on public.owner_sessions (expires_at);

commit;
