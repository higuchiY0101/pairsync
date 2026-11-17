create extension if not exists pgcrypto;

create table public.pairs (
  id uuid primary key default gen_random_uuid(),
  invite_hash text not null unique,
  created_at timestamptz not null default now()
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  position smallint not null check (position in (1, 2)),
  session_hash text not null unique,
  refresh_token_ciphertext text,
  calendar_connected_at timestamptz,
  created_at timestamptz not null default now(),
  unique(pair_id, position)
);

alter table public.pairs enable row level security;
alter table public.members enable row level security;
-- No browser policies: all access is through server routes using the service-role key.
