-- =====================================================================
-- SKOR SPOR — athlete profiles
--
-- One row per athlete, readable and writable only by that athlete.
-- Safe to re-run: every statement is idempotent and the script runs in a
-- single transaction (all-or-nothing). Contains no DROP TABLE, TRUNCATE or
-- DELETE, and never modifies auth.users.
--
-- Transactions (verified offline with Supabase CLI 3.1.0 `db push` against
-- PostgreSQL): the CLI already wraps each migration in a transaction, so a
-- failure rolls everything back and records no history, with or without the
-- explicit begin/commit below. They are kept so the file stays atomic on
-- paths that may not add one (SQL Editor, API). If the history row is ever
-- missed after commit, re-pushing is harmless because the script is idempotent.
--
-- Allowed values mirror src/features/athlete/catalog.ts (SPORTS, GOALS,
-- LIMITS). e2e/unit/migration-catalog.spec.ts fails if they drift apart.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Table (columns, types, keys). Rules are added as named constraints
--    in step 2 so a re-run can bring an existing table up to date.
-- ---------------------------------------------------------------------
create table if not exists public.athlete_profiles (
  user_id          uuid         primary key references auth.users (id) on delete cascade,
  primary_sport    text         not null,
  secondary_sports text[]       not null default '{}',
  goals            text[]       not null default '{}',
  age              smallint     not null,
  height_cm        smallint     not null,
  weight_kg        numeric(5,1) not null,
  created_at       timestamptz  not null default now(),
  updated_at       timestamptz  not null default now()
);

comment on table public.athlete_profiles is
  'SKOR SPOR athlete profile (1:1 with auth.users). RLS: owner-only select/insert/update.';

-- ---------------------------------------------------------------------
-- 2. Data validation (re-runnable: drop-if-exists + add, per constraint)
-- ---------------------------------------------------------------------

-- Primary sport: one of the app's sport ids. The value list also bounds
-- the length; the explicit length check guards against list edits.
alter table public.athlete_profiles drop constraint if exists athlete_profiles_primary_sport_valid;
alter table public.athlete_profiles add constraint athlete_profiles_primary_sport_valid check (
  char_length(primary_sport) between 1 and 32
  and primary_sport in (
    'fitness', 'bodybuilding', 'boxing', 'kickboxing', 'karate', 'football',
    'basketball', 'volleyball', 'running', 'swimming', 'tennis'
  )
);

-- Secondary sports: one-dimensional, at most 4, only known ids (`<@`
-- also rejects NULL elements), and never the primary sport.
alter table public.athlete_profiles drop constraint if exists athlete_profiles_secondary_sports_valid;
alter table public.athlete_profiles add constraint athlete_profiles_secondary_sports_valid check (
  coalesce(array_ndims(secondary_sports), 1) = 1
  and cardinality(secondary_sports) <= 4
  and secondary_sports <@ array[
    'fitness', 'bodybuilding', 'boxing', 'kickboxing', 'karate', 'football',
    'basketball', 'volleyball', 'running', 'swimming', 'tennis'
  ]::text[]
  and not (primary_sport = any (secondary_sports))
);

-- Goals: one-dimensional, at most 3, only known ids.
alter table public.athlete_profiles drop constraint if exists athlete_profiles_goals_valid;
alter table public.athlete_profiles add constraint athlete_profiles_goals_valid check (
  coalesce(array_ndims(goals), 1) = 1
  and cardinality(goals) <= 3
  and goals <@ array[
    'muscle_gain', 'fat_loss', 'strength', 'endurance',
    'performance', 'competition', 'mobility', 'wellness'
  ]::text[]
);

-- Body metrics: same ranges as the app (LIMITS).
alter table public.athlete_profiles drop constraint if exists athlete_profiles_age_range;
alter table public.athlete_profiles add constraint athlete_profiles_age_range check (age between 13 and 90);

alter table public.athlete_profiles drop constraint if exists athlete_profiles_height_range;
alter table public.athlete_profiles add constraint athlete_profiles_height_range check (height_cm between 120 and 230);

alter table public.athlete_profiles drop constraint if exists athlete_profiles_weight_range;
alter table public.athlete_profiles add constraint athlete_profiles_weight_range check (weight_kg between 30 and 250);

-- ---------------------------------------------------------------------
-- 3. Server-managed timestamps and immutable owner
--    Client-sent created_at / updated_at are always overwritten, so the
--    app can keep sending its full row while the server stays authoritative.
-- ---------------------------------------------------------------------
create or replace function public.athlete_profiles_set_timestamps()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
  else
    if new.user_id is distinct from old.user_id then
      raise exception 'athlete_profiles.user_id cannot be changed'
        using errcode = '42501';
    end if;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.athlete_profiles_set_timestamps() is
  'Trigger for athlete_profiles: server-side created_at/updated_at, user_id immutable.';

-- Trigger functions cannot be called directly; keep them off the API anyway.
revoke all on function public.athlete_profiles_set_timestamps() from public, anon, authenticated;

drop trigger if exists athlete_profiles_set_timestamps on public.athlete_profiles;
create trigger athlete_profiles_set_timestamps
  before insert or update on public.athlete_profiles
  for each row execute function public.athlete_profiles_set_timestamps();

-- ---------------------------------------------------------------------
-- 4. Privileges: nothing for anon; select/insert/update for signed-in
--    users (no delete, truncate, references or trigger).
-- ---------------------------------------------------------------------
revoke all on table public.athlete_profiles from public, anon, authenticated;
grant select, insert, update on table public.athlete_profiles to authenticated;

-- ---------------------------------------------------------------------
-- 5. Row level security: each athlete sees and changes only their row.
-- ---------------------------------------------------------------------
alter table public.athlete_profiles enable row level security;

drop policy if exists athlete_profiles_select_own on public.athlete_profiles;
create policy athlete_profiles_select_own on public.athlete_profiles
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists athlete_profiles_insert_own on public.athlete_profiles;
create policy athlete_profiles_insert_own on public.athlete_profiles
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists athlete_profiles_update_own on public.athlete_profiles;
create policy athlete_profiles_update_own on public.athlete_profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- No delete policy on purpose: profiles are removed only together with the
-- auth user (on delete cascade), e.g. by a future server-side account deletion.

commit;
