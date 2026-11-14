-- Behavioural tests for item kinds, events and kids' profiles.
\set ON_ERROR_STOP on
\set QUIET on
\pset tuples_only on
\pset format unaligned
-- Runs in a transaction that is rolled back, so other test files start clean.
begin;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'parent1@example.com'),
  ('00000000-0000-0000-0000-0000000000d2', 'neighbor@example.com');

create function pg_temp.as_user(u text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', u, false);
  execute 'set role authenticated';
end $$;

create function pg_temp.check(ok boolean, label text) returns void language plpgsql as $$
begin
  if not ok then raise exception 'FAILED: %', label; end if;
  raise notice 'ok - %', label;
end $$;

create function pg_temp.fails(sql text) returns boolean language plpgsql as $$
begin
  execute sql;
  return false;
exception when others then
  return true;
end $$;

-- A parent sets up a household with two kids
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select create_household('Planner Home') as hid \gset
insert into kids (household_id, name, color) values (:'hid', 'Emma', 'rose'), (:'hid', 'Jake', 'sky');
select id as emma from kids where name = 'Emma' \gset
select id as jake from kids where name = 'Jake' \gset
select pg_temp.check((select count(*) from kids) = 2, 'parent sees their kids');

-- Events with kids tagged
insert into tasks (household_id, kind, title, due_date, due_time, end_time, location, kid_ids)
values (:'hid', 'event', 'Soccer practice', '2026-11-17', '17:00', '18:30', 'Riverside Park', array[:'emma'::uuid, :'jake'::uuid]);
select pg_temp.check((select kind from tasks where title = 'Soccer practice') = 'event', 'event stored');
select pg_temp.check((select cardinality(kid_ids) from tasks where title = 'Soccer practice') = 2, 'both kids tagged');
select pg_temp.check((select kind from tasks where title is not null limit 1) in ('task', 'chore', 'event'), 'kind constrained');

select set_config('test.hid', :'hid', false);
select pg_temp.check(pg_temp.fails($$insert into tasks (household_id, kind, title) values (current_setting('test.hid')::uuid, 'event', 'No date')$$), 'event without a date rejected');
select pg_temp.check(pg_temp.fails($$insert into tasks (household_id, kind, title, due_date, due_time, end_time) values (current_setting('test.hid')::uuid, 'event', 'Backwards', '2026-11-17', '10:00', '09:00')$$), 'end before start rejected');
select pg_temp.check(pg_temp.fails($$insert into tasks (household_id, kind, title) values (current_setting('test.hid')::uuid, 'meeting', 'Bad kind')$$), 'unknown kind rejected');
select pg_temp.check(pg_temp.fails($$insert into tasks (household_id, title, kid_ids) values (current_setting('test.hid')::uuid, 'Ghost kid', array[gen_random_uuid()])$$), 'unknown kid rejected');

-- A neighbor can't see or tag our kids
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d2');
select pg_temp.check((select count(*) from kids) = 0, 'outsider sees no kids');
select create_household('Neighbor Home') as nhid \gset
select set_config('test.nhid', :'nhid', false);
select set_config('test.emma', :'emma', false);
select pg_temp.check(pg_temp.fails($$insert into tasks (household_id, title, kid_ids) values (current_setting('test.nhid')::uuid, 'Borrow a kid', array[current_setting('test.emma')::uuid])$$), 'cannot tag another household''s kid');
select pg_temp.check(pg_temp.fails($$insert into kids (household_id, name) values (current_setting('test.hid')::uuid, 'Intruder')$$), 'cannot add kids to another household');

-- Deleting a kid untags them but keeps the event
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
delete from kids where id = :'jake';
select pg_temp.check((select kid_ids from tasks where title = 'Soccer practice') = array[:'emma'::uuid], 'deleted kid untagged');
select pg_temp.check((select count(*) from tasks where title = 'Soccer practice') = 1, 'event kept after kid removed');
reset role;
rollback;
