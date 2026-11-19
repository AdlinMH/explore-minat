-- Eksplorasi Minat Karier — skema awal.
-- Aman dijalankan ulang (idempotent). Jalankan di Supabase SQL Editor atau `supabase db push`.
-- Semua akses data lewat server (koneksi Postgres server-only). Role anon/authenticated
-- tidak mendapat hak apa pun, dan RLS aktif tanpa policy sehingga Data API menolak akses.

create extension if not exists pgcrypto;

-- Kelas ---------------------------------------------------------------------
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  label text not null check (char_length(label) between 2 and 60),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists classes_label_lower_key on public.classes (lower(label));

-- Respons -------------------------------------------------------------------
create table if not exists public.responses (
  id uuid primary key default gen_random_uuid(),
  submission_key uuid not null,
  owner_token_hash text not null check (char_length(owner_token_hash) = 64),
  name text not null check (char_length(name) between 2 and 100),
  class_id uuid not null references public.classes (id) on delete restrict,
  questionnaire_version text not null,
  answers jsonb not null check (jsonb_typeof(answers) = 'object'),
  scores jsonb not null check (jsonb_typeof(scores) = 'object'),
  top_category_ids text[] not null default '{}',
  highest_category_ids text[] not null default '{}',
  result_pattern text not null check (result_pattern in ('normal', 'all_equal', 'all_min', 'all_max')),
  exploration_status text not null check (exploration_status in ('belum_tahu', 'mulai_gambaran', 'beberapa_bidang')),
  other_interest text check (other_interest is null or char_length(other_interest) <= 300),
  reflection text check (reflection is null or char_length(reflection) <= 500),
  created_at timestamptz not null default now()
);
create unique index if not exists responses_submission_key_key on public.responses (submission_key);
create index if not exists responses_class_created_idx on public.responses (class_id, created_at desc);
create index if not exists responses_created_idx on public.responses (created_at desc);
create index if not exists responses_name_lower_idx on public.responses (lower(name));

-- Sesi admin (hanya hash token yang disimpan) ----------------------------------
create table if not exists public.admin_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null check (char_length(token_hash) = 64),
  credential_fingerprint text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);
create unique index if not exists admin_sessions_token_hash_key on public.admin_sessions (token_hash);
create index if not exists admin_sessions_expires_idx on public.admin_sessions (expires_at);

-- Rate limit persisten (fixed window, lintas instance) ---------------------------
create table if not exists public.rate_limits (
  bucket text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (bucket, window_start)
);
create index if not exists rate_limits_window_idx on public.rate_limits (window_start);

-- Cache penjelasan AI (privat, per respons & versi) -------------------------------
create table if not exists public.result_explanations (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.responses (id) on delete cascade,
  questionnaire_version text not null,
  prompt_version text not null,
  model text not null,
  status text not null check (status in ('pending', 'success', 'fallback')),
  content jsonb,
  error_code text,
  attempts integer not null default 0,
  lease_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists result_explanations_key
  on public.result_explanations (response_id, questionnaire_version, prompt_version, model);

-- Keamanan: RLS aktif, tanpa policy, tanpa grant untuk anon/authenticated ---------
alter table public.classes enable row level security;
alter table public.responses enable row level security;
alter table public.admin_sessions enable row level security;
alter table public.rate_limits enable row level security;
alter table public.result_explanations enable row level security;

do $$
declare
  r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on table public.classes, public.responses, public.admin_sessions, public.rate_limits, public.result_explanations from %I', r);
    end if;
  end loop;
end
$$;
