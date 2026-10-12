-- Behavioural tests for households, invites, ownership and row-level security.
\set ON_ERROR_STOP on
\set QUIET on
\pset tuples_only on
\pset format unaligned
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'andy@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'allie@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'stranger@example.com');

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

-- Profiles are created by trigger
select pg_temp.check((select count(*) from profiles) = 3, 'profiles auto-created');

-- Andy creates a household and an invite
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
update profiles set display_name = 'Andy' where id = auth.uid();
select create_household('Harrison Home') as hid \gset
select create_invite(:'hid', 'Allie') as token \gset

insert into areas (household_id, name, owner_id) values (:'hid', 'Groceries', auth.uid());
insert into areas (household_id, name, owner_id) values (:'hid', 'Travel', null);
insert into tasks (household_id, area_id, title, assignee_id, created_by)
  select :'hid', id, 'Plan next trip', null, auth.uid() from areas where name = 'Travel';
select pg_temp.check((select count(*) from areas) = 2, 'andy sees his areas');

-- Stranger sees nothing and can't write into the household
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.check((select count(*) from areas) = 0, 'stranger sees no areas');
select pg_temp.check((select count(*) from households) = 0, 'stranger sees no households');
select pg_temp.check((select count(*) from profiles) = 1, 'stranger sees only own profile');
select set_config('test.hid', :'hid', false);
do $$ begin
  insert into tasks (household_id, title) values (current_setting('test.hid')::uuid, 'sneaky');
  raise exception 'should not reach';
exception when insufficient_privilege then
  null; -- RLS rejected the insert, as expected
end $$;
select pg_temp.check(true, 'stranger cannot insert into the household');
do $$ begin
  perform hand_off_area((select id from areas where household_id = current_setting('test.hid')::uuid limit 1), auth.uid());
  raise exception 'should not reach';
exception when others then
  if sqlerrm = 'should not reach' then raise; end if;
end $$;
select pg_temp.check(true, 'stranger cannot hand off an area');
select pg_temp.check((select status from get_invite(:'token')) = 'ok', 'invite preview works for invitee');
select pg_temp.check((select status from get_invite('nope')) = 'invalid', 'bad token is invalid');

-- Allie accepts; she inherits the unowned area and its tasks
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select accept_invite(:'token') = :'hid' as joined \gset
select pg_temp.check(:'joined'::boolean, 'allie joined');
select pg_temp.check((select owner_id from areas where name = 'Travel') = auth.uid(), 'allie owns Travel');
select pg_temp.check((select assignee_id from tasks where title = 'Plan next trip') = auth.uid(), 'travel task assigned to allie');
select pg_temp.check((select count(*) from profiles) = 2, 'allie sees both profiles');

-- Household is full now; stranger can't use the (used) token
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.check((select status from get_invite(:'token')) = 'used', 'token marked used');
do $$ begin
  perform accept_invite('whatever');
  raise exception 'should not reach';
exception when others then
  if sqlerrm = 'should not reach' then raise; end if;
end $$;

-- Owners/assignees must be members
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
do $$ begin
  update areas set owner_id = '00000000-0000-0000-0000-00000000000c' where name = 'Groceries';
  raise exception 'should not reach';
exception when others then
  if sqlerrm = 'should not reach' then raise; end if;
end $$;
select pg_temp.check(true, 'non-member owner rejected');

-- Hand-off moves the area and its open tasks, and is recorded
insert into tasks (household_id, area_id, title, assignee_id, created_by)
  select household_id, id, 'Weekly shop', owner_id, owner_id from areas where name = 'Groceries';
select hand_off_area((select id from areas where name = 'Groceries'), '00000000-0000-0000-0000-00000000000b', 'Swapping for a month');
select pg_temp.check((select owner_id from areas where name = 'Groceries') = '00000000-0000-0000-0000-00000000000b', 'handoff changed owner');
select pg_temp.check((select assignee_id from tasks where title = 'Weekly shop') = '00000000-0000-0000-0000-00000000000b', 'handoff moved open task');
select pg_temp.check((select count(*) from area_handoffs) = 1, 'handoff recorded');
