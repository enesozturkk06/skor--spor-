-- SKOR SPOR — athlete profiles
-- Run in Supabase SQL editor (or `supabase db push`) once the project exists.

create table if not exists public.athlete_profiles (
  user_id          uuid primary key references auth.users (id) on delete cascade,
  primary_sport    text        not null,
  secondary_sports text[]      not null default '{}',
  goals            text[]      not null default '{}',
  age              smallint    not null check (age between 13 and 90),
  height_cm        smallint    not null check (height_cm between 120 and 230),
  weight_kg        numeric(5,1) not null check (weight_kg between 30 and 250),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint secondary_sports_max check (cardinality(secondary_sports) <= 4),
  constraint goals_max check (cardinality(goals) <= 3)
);

alter table public.athlete_profiles enable row level security;

-- Each athlete can only see and change their own profile.
create policy "athlete_profiles_select_own" on public.athlete_profiles
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "athlete_profiles_insert_own" on public.athlete_profiles
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "athlete_profiles_update_own" on public.athlete_profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists athlete_profiles_touch on public.athlete_profiles;
create trigger athlete_profiles_touch
  before update on public.athlete_profiles
  for each row execute function public.touch_updated_at();
