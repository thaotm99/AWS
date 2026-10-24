-- A mock exam in progress keeps its flags and the question on screen, so it resumes on another device.
alter table mock_sessions
  add column flags jsonb not null default '[]',
  add column position int not null default 0;
create unique index mock_sessions_open on mock_sessions (user_id, cert_id, set_id) where submitted_at is null;
