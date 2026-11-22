begin;

create table public.quizzes (
  id uuid primary key,
  owner_id uuid not null references auth.users (id) on delete cascade,
  questions jsonb not null check (jsonb_typeof(questions) = 'array'),
  created_at timestamptz not null default now(),
  unique (id, owner_id)
);

create table public.quiz_attempts (
  quiz_id uuid primary key,
  owner_id uuid not null,
  answers jsonb not null check (jsonb_typeof(answers) = 'object'),
  score integer not null,
  total integer not null check (total > 0),
  results jsonb not null check (jsonb_typeof(results) = 'array'),
  created_at timestamptz not null default now(),
  foreign key (quiz_id, owner_id) references public.quizzes (id, owner_id) on delete cascade,
  check (score between 0 and total)
);

alter table public.quizzes enable row level security;
alter table public.quiz_attempts enable row level security;

revoke all on public.quizzes, public.quiz_attempts from public, anon, authenticated, service_role;
grant select, insert on public.quizzes, public.quiz_attempts to service_role;

commit;
