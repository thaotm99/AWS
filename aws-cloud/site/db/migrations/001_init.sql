-- CloudLab schema: accounts, learner data and practice tests, keyed by certification so a second
-- certification needs rows, not tables. See aws-cloud/PLAN-accounts.md and PLAN-multi-cert.md.

-- ---------- Certifications (synced from the repo by scripts/import-questions.ts) ----------
create table certifications (
  id text primary key,                         -- "saa-c03"
  code text not null,                          -- "SAA-C03"
  provider text not null default 'aws',
  name text not null,
  level text not null,                         -- Foundational | Associate | Professional | Specialty
  minutes int not null,
  question_count int not null,
  passing_score int not null,
  score_min int not null default 100,
  score_max int not null default 1000,
  status text not null default 'ready' check (status in ('ready', 'soon', 'retired')),
  retires_on date
);

create table cert_domains (
  cert_id text not null references certifications(id) on delete cascade,
  id text not null,                            -- position as text ("0", "1"…) unless the cert file names it
  position int not null,
  name text not null,                          -- English name, as in the exam guide and the practice tests
  weight numeric(4, 3) not null,
  primary key (cert_id, id)
);

-- ---------- Practice tests (copyrighted: only ever served to signed-in users) ----------
create table practice_sets (
  cert_id text not null references certifications(id) on delete cascade,
  id text not null,                            -- the exam id the site already uses
  number int not null,
  title text not null,
  question_count int not null,
  multi_select_count int not null,
  primary key (cert_id, id),
  unique (cert_id, number)
);

create table questions (
  id text primary key,                         -- original question id, so attempts and illustrations match
  cert_id text not null references certifications(id) on delete cascade,
  set_id text not null,
  position int not null,                       -- 1-based number in its practice test
  domain_id text,
  select_count int not null,
  content_en jsonb not null,                   -- { promptHtml, options: [{ key, html }] }
  content_vi jsonb,                            -- null: not translated, the English original is shown
  correct jsonb not null,                      -- ["A", "C"]; never sent with the question
  explanation_en text not null,
  explanation_vi text,
  learn jsonb not null default '[]',           -- lesson parts that teach the question
  foreign key (cert_id, set_id) references practice_sets(cert_id, id) on delete cascade,
  foreign key (cert_id, domain_id) references cert_domains(cert_id, id),
  unique (cert_id, set_id, position)
);

-- Questions about one lesson, in study order (a question can belong to several lessons).
create table question_topics (
  cert_id text not null references certifications(id) on delete cascade,
  topic_id text not null,                      -- lesson id, e.g. "s3"
  position int not null,
  question_id text not null references questions(id) on delete cascade,
  primary key (cert_id, topic_id, position),
  unique (cert_id, topic_id, question_id)
);

create table cert_topics (
  cert_id text not null references certifications(id) on delete cascade,
  id text not null,
  position int not null,
  title_vi text not null,
  title_en text not null,
  primary key (cert_id, id)
);

-- ---------- Accounts ----------
create table users (
  id text primary key,                         -- Google "sub"
  email text not null unique,
  name text,
  picture text,
  current_cert_id text references certifications(id) on delete set null,
  created_at timestamptz not null default now(),
  last_login_at timestamptz not null default now()
);

create table sessions (
  id uuid primary key,                         -- "sid" in the session cookie
  user_id text not null references users(id) on delete cascade,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);
create index sessions_user on sessions (user_id);

-- Certifications a learner studies: exam date and status per certification.
create table user_certs (
  user_id text not null references users(id) on delete cascade,
  cert_id text not null references certifications(id) on delete cascade,
  status text not null default 'studying' check (status in ('studying', 'paused', 'passed')),
  exam_date date,
  target_score int,
  started_at timestamptz not null default now(),
  passed_at timestamptz,
  primary key (user_id, cert_id)
);

-- Learner data shared by every certification (progress, flashcards, notes, goals, Pomodoro, labs…),
-- one JSON document per former browser-storage key.
create table user_docs (
  user_id text not null references users(id) on delete cascade,
  name text not null,
  value jsonb not null,
  version int not null default 1,
  updated_at timestamptz not null default now(),
  primary key (user_id, name)
);

-- ---------- Practice attempts ----------
create table attempts (
  id uuid primary key,
  user_id text not null references users(id) on delete cascade,
  cert_id text not null references certifications(id) on delete cascade,
  exam_id text not null,                       -- practice set id, "topic-<lesson>" or "review"
  question_count int not null,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz
);
create index attempts_user_cert on attempts (user_id, cert_id, started_at desc);

create table attempt_answers (
  attempt_id uuid not null references attempts(id) on delete cascade,
  question_id text not null references questions(id) on delete cascade,
  chosen jsonb not null,
  correct boolean not null,
  answered_at timestamptz not null default now(),
  primary key (attempt_id, question_id)
);

create table mock_sessions (
  id uuid primary key,
  user_id text not null references users(id) on delete cascade,
  cert_id text not null references certifications(id) on delete cascade,
  set_id text not null,
  started_at timestamptz not null,
  submitted_at timestamptz,
  answers jsonb not null default '{}',         -- { questionId: ["A"] }
  score numeric(5, 2),
  scaled_score int,
  domain_scores jsonb,
  foreign key (cert_id, set_id) references practice_sets(cert_id, id) on delete cascade
);
create index mock_sessions_user_cert on mock_sessions (user_id, cert_id, started_at desc);

-- ---------- Protection of the practice tests ----------
create table rate_limits (
  user_id text not null references users(id) on delete cascade,
  bucket text not null,
  window_start timestamptz not null,
  count int not null,
  primary key (user_id, bucket, window_start)
);

create table audit_log (
  id bigserial primary key,
  user_id text,
  action text not null,                        -- e.g. "practice.read", "auth.login"
  target text,
  at timestamptz not null default now()
);
create index audit_log_user_at on audit_log (user_id, at desc);
