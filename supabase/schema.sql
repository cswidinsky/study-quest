-- ═════════════════════════════════════════════════════════════════════════════
--  StudyQuest database schema (Supabase / Postgres)
-- ═════════════════════════════════════════════════════════════════════════════
--  How to use: Supabase dashboard → SQL Editor → New query → paste this whole
--  file → Run. It is safe to run again (it only adds what is missing).
--
--  Every row belongs to one user (user_id = the auth user's id), and Row Level
--  Security makes sure each signed-in user can only read and write their OWN rows.
--  The anon key in the frontend can't read anything without a signed-in user.
--
--  Tables
--    profiles       one per user: full name (made automatically on sign-up)
--    user_progress  one per user: XP, level, streak, daily activity
--    decks          a user's decks
--    cards          the questions in each deck, with their spaced-repetition state
--    reviews        the answer log: one row per answer
-- ═════════════════════════════════════════════════════════════════════════════

-- ——— Tables ———

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '' check (char_length(full_name) <= 80),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.user_progress (
  user_id          uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  xp               integer not null default 0 check (xp >= 0),
  level            integer not null default 1 check (level >= 1),
  streak_current   integer not null default 0 check (streak_current >= 0),
  streak_longest   integer not null default 0 check (streak_longest >= 0),
  last_study_date  date,
  activity         jsonb not null default '[]'::jsonb,  -- answers per day: [{ date, answered, correct }]
  reported         text[] not null default '{}',        -- card ids the user flagged as wrong
  updated_at       timestamptz not null default now()
);

create table if not exists public.decks (
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id               text not null,                -- made by the app, unique per user
  title            text not null check (char_length(title) <= 200),
  course           jsonb,                        -- { code, name }
  color            text,
  exam             jsonb,                        -- { name, at } or null
  source           jsonb,                        -- { type: 'pdf', fileName } or { type: 'manual' }
  created_at       timestamptz not null default now(),
  last_studied_at  timestamptz,
  primary key (user_id, id)
);

create table if not exists public.cards (
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id              text not null,
  deck_id         text not null,
  position        integer not null default 0,    -- order of the cards in the app
  type            text not null check (type in ('mc', 'flash')),
  question        text not null,
  options         jsonb,                          -- multiple choice: 4 strings
  correct_index   smallint,                       -- null until known (the Flask server grades it)
  answer          text,
  explanation     text,
  difficulty      text check (difficulty is null or difficulty in ('easy', 'medium', 'hard')),
  topic           text,
  source_snippet  text,
  source_page     integer,
  remote          jsonb,                          -- { quizId, questionId } for Flask-graded cards
  review          jsonb not null default '{}'::jsonb, -- spaced-repetition state
  created_at      timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, deck_id) references public.decks (user_id, id) on delete cascade
);
create index if not exists cards_user_deck_idx on public.cards (user_id, deck_id);

create table if not exists public.reviews (
  id            bigint generated always as identity primary key,
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  card_id       text not null,
  deck_id       text,
  correct       boolean not null,
  chosen_index  smallint,
  self_grade    text check (self_grade is null or self_grade in ('got', 'missed')),
  xp            integer not null default 0,
  combo         integer not null default 0,
  answered_at   timestamptz not null default now()
);
create index if not exists reviews_user_time_idx on public.reviews (user_id, answered_at desc);

-- ——— Keep updated_at fresh ———

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists user_progress_touch on public.user_progress;
create trigger user_progress_touch before update on public.user_progress
  for each row execute function public.touch_updated_at();

-- ——— A new account gets a profile (with the name typed at sign-up) and empty progress ———

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, left(coalesce(trim(new.raw_user_meta_data ->> 'full_name'), ''), 80))
  on conflict (id) do nothing;

  insert into public.user_progress (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Accounts made before this file was run get their rows too.
insert into public.profiles (id, full_name)
select id, left(coalesce(trim(raw_user_meta_data ->> 'full_name'), ''), 80) from auth.users
on conflict (id) do nothing;

insert into public.user_progress (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- ——— Row Level Security: you only ever see and change your own rows ———

alter table public.profiles       enable row level security;
alter table public.user_progress  enable row level security;
alter table public.decks          enable row level security;
alter table public.cards          enable row level security;
alter table public.reviews        enable row level security;

-- profiles
drop policy if exists "Users read their own profile" on public.profiles;
create policy "Users read their own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

drop policy if exists "Users create their own profile" on public.profiles;
create policy "Users create their own profile" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);

drop policy if exists "Users update their own profile" on public.profiles;
create policy "Users update their own profile" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- user_progress
drop policy if exists "Users read their own progress" on public.user_progress;
create policy "Users read their own progress" on public.user_progress
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users create their own progress" on public.user_progress;
create policy "Users create their own progress" on public.user_progress
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Users update their own progress" on public.user_progress;
create policy "Users update their own progress" on public.user_progress
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- decks
drop policy if exists "Users manage their own decks" on public.decks;
create policy "Users manage their own decks" on public.decks
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- cards
drop policy if exists "Users manage their own cards" on public.cards;
create policy "Users manage their own cards" on public.cards
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- reviews: an answer log, so rows can be added and read but not changed
drop policy if exists "Users read their own answers" on public.reviews;
create policy "Users read their own answers" on public.reviews
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users log their own answers" on public.reviews;
create policy "Users log their own answers" on public.reviews
  for insert to authenticated with check ((select auth.uid()) = user_id);

-- ——— Table permissions: signed-in users only (RLS above still applies to every row) ———

revoke all on public.profiles, public.user_progress, public.decks, public.cards, public.reviews from anon, authenticated;

grant select, insert, update          on public.profiles      to authenticated;
grant select, insert, update          on public.user_progress to authenticated;
grant select, insert, update, delete  on public.decks         to authenticated;
grant select, insert, update, delete  on public.cards         to authenticated;
grant select, insert                  on public.reviews       to authenticated;
