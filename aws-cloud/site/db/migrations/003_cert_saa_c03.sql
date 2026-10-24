-- The certification the site teaches today, so a learner's exam date (user_certs) can be saved before
-- the practice-test import runs. The import upserts the full row later; this only makes sure it exists.
insert into certifications (id, code, provider, name, level, minutes, question_count, passing_score)
values ('saa-c03', 'SAA-C03', 'aws', 'AWS Certified Solutions Architect - Associate', 'Associate', 130, 65, 720)
on conflict (id) do nothing;
