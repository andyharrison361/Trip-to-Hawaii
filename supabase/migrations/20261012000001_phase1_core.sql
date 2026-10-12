-- Life Partner — Phase 1 schema
-- Households, members, invites, areas (ownership), hand-offs, tasks, API tokens.
-- Every household-owned row carries household_id and is protected by row-level security.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Profiles (one per auth user)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  timezone text not null default 'America/Chicago',
  -- Notification preferences (used from Phase 2 on)
  default_reminder_time time not null default '09:00',
  quiet_hours_start time default '21:30',
  quiet_hours_end time default '07:30',
  digest_enabled boolean not null default true,
  digest_time time not null default '07:30',
  max_nudges int not null default 3 check (max_nudges between 0 and 14),
  created_at timestamptz not null default now()
);

-- Create a profile automatically when someone signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Households and membership
-- ---------------------------------------------------------------------------
create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'America/Chicago',
  max_members int not null default 2,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);
create index household_members_user_idx on public.household_members (user_id);

-- Membership check used by every policy. SECURITY DEFINER so it can read
-- household_members without recursing into that table's own policy.
create function public.is_household_member(hid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.household_members
    where household_id = hid and user_id = auth.uid()
  );
$$;

create function public.shares_household_with(other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members me
    join public.household_members them on them.household_id = me.household_id
    where me.user_id = auth.uid() and them.user_id = other
  );
$$;

create table public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  token_hash text not null unique,
  invitee_name text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days',
  accepted_by uuid references auth.users (id) on delete set null,
  accepted_at timestamptz
);
create index household_invites_household_idx on public.household_invites (household_id);

-- ---------------------------------------------------------------------------
-- Areas (ownership) and hand-offs
-- ---------------------------------------------------------------------------
create table public.areas (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  icon text,
  category text,
  -- null owner = waiting for the invited partner to join
  owner_id uuid references auth.users (id) on delete set null,
  minimum_standard text not null default '',
  template_key text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);
create index areas_household_idx on public.areas (household_id);

create table public.area_handoffs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  area_id uuid not null references public.areas (id) on delete cascade,
  from_user uuid references auth.users (id) on delete set null,
  to_user uuid references auth.users (id) on delete set null,
  note text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index area_handoffs_household_idx on public.area_handoffs (household_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Tasks
-- Dates are stored as local calendar dates/times in the household's timezone.
-- ---------------------------------------------------------------------------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  area_id uuid references public.areas (id) on delete set null,
  title text not null check (length(trim(title)) > 0),
  notes text not null default '',
  assignee_id uuid references auth.users (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  due_date date,
  due_time time,
  remind_days_before int check (remind_days_before between 0 and 90),
  reminder_time time,
  -- RFC 5545 RRULE body, e.g. 'FREQ=MONTHLY;BYMONTHDAY=20'
  recurrence text,
  recurrence_mode text not null default 'fixed' check (recurrence_mode in ('fixed', 'after_completion')),
  series_id uuid,
  status text not null default 'open' check (status in ('open', 'done', 'skipped')),
  completed_at timestamptz,
  completed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_household_status_due_idx on public.tasks (household_id, status, due_date);
create index tasks_assignee_status_due_idx on public.tasks (assignee_id, status, due_date);
create index tasks_area_idx on public.tasks (area_id, status);
create index tasks_series_idx on public.tasks (series_id);

create function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tasks_touch_updated_at
  before update on public.tasks
  for each row execute function public.touch_updated_at();

-- Owners and assignees must belong to the row's household; areas must too.
create function public.check_household_refs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  person uuid;
begin
  if tg_table_name = 'areas' then
    person := new.owner_id;
  else
    person := new.assignee_id;
    if new.area_id is not null and not exists (
      select 1 from public.areas where id = new.area_id and household_id = new.household_id
    ) then
      raise exception 'Area does not belong to this household';
    end if;
  end if;

  if person is not null and not exists (
    select 1 from public.household_members
    where household_id = new.household_id and user_id = person
  ) then
    raise exception 'That person is not a member of this household';
  end if;
  return new;
end;
$$;

create trigger areas_check_refs
  before insert or update on public.areas
  for each row execute function public.check_household_refs();

create trigger tasks_check_refs
  before insert or update on public.tasks
  for each row execute function public.check_household_refs();

-- ---------------------------------------------------------------------------
-- Personal API tokens (for a future Siri Shortcut, etc.). Only hashes stored.
-- ---------------------------------------------------------------------------
create table public.api_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null default 'Shortcut',
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;
alter table public.areas enable row level security;
alter table public.area_handoffs enable row level security;
alter table public.tasks enable row level security;
alter table public.api_tokens enable row level security;

create policy "read own and household profiles" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.shares_household_with(id));
create policy "update own profile" on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "members read household" on public.households
  for select to authenticated using (public.is_household_member(id));
create policy "members update household" on public.households
  for update to authenticated
  using (public.is_household_member(id)) with check (public.is_household_member(id));

create policy "members read membership" on public.household_members
  for select to authenticated using (public.is_household_member(household_id));

create policy "members read invites" on public.household_invites
  for select to authenticated using (public.is_household_member(household_id));
create policy "members delete invites" on public.household_invites
  for delete to authenticated using (public.is_household_member(household_id));

create policy "members manage areas" on public.areas
  for all to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "members manage handoffs" on public.area_handoffs
  for all to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "members manage tasks" on public.tasks
  for all to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "own api tokens" on public.api_tokens
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.is_household_member(household_id));

-- ---------------------------------------------------------------------------
-- RPCs for the steps RLS can't express simply
-- ---------------------------------------------------------------------------

-- Create a household and make the caller its first member.
create function public.create_household(p_name text, p_timezone text default 'America/Chicago')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  hid uuid;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;
  if exists (select 1 from public.household_members where user_id = uid) then
    raise exception 'You already belong to a household';
  end if;

  insert into public.households (name, timezone, created_by)
  values (coalesce(nullif(trim(p_name), ''), 'Our home'), coalesce(p_timezone, 'America/Chicago'), uid)
  returning id into hid;

  insert into public.household_members (household_id, user_id, role) values (hid, uid, 'owner');
  return hid;
end;
$$;

-- Create an invite link token. Returns the plain token once; only its hash is stored.
create function public.create_invite(p_household_id uuid, p_invitee_name text default null)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  token text;
begin
  if not public.is_household_member(p_household_id) then
    raise exception 'Not a member of this household';
  end if;
  token := encode(extensions.gen_random_bytes(18), 'hex');
  insert into public.household_invites (household_id, token_hash, invitee_name, created_by)
  values (
    p_household_id,
    encode(extensions.digest(token, 'sha256'), 'hex'),
    nullif(trim(coalesce(p_invitee_name, '')), ''),
    auth.uid()
  );
  return token;
end;
$$;

-- Look up an invite before accepting it (works for any signed-in user holding the token).
create function public.get_invite(p_token text)
returns table (household_name text, inviter_name text, invitee_name text, status text)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  inv public.household_invites;
  member_count int;
  cap int;
begin
  select * into inv from public.household_invites
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');

  if not found then
    return query select null::text, null::text, null::text, 'invalid'::text;
    return;
  end if;

  select count(*) into member_count from public.household_members where household_id = inv.household_id;
  select max_members into cap from public.households where id = inv.household_id;

  return query
  select h.name,
         p.display_name,
         inv.invitee_name,
         case
           when inv.accepted_at is not null then 'used'
           when inv.expires_at < now() then 'expired'
           when member_count >= cap then 'full'
           else 'ok'
         end
  from public.households h
  left join public.profiles p on p.id = inv.created_by
  where h.id = inv.household_id;
end;
$$;

-- Join a household with an invite token. Areas and tasks that were waiting for
-- "the partner" (no owner yet) are handed to the person joining.
create function public.accept_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  uid uuid := auth.uid();
  inv public.household_invites;
  member_count int;
  cap int;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;

  select * into inv from public.household_invites
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  for update;

  if not found then
    raise exception 'This invite link is not valid';
  end if;
  if exists (select 1 from public.household_members where household_id = inv.household_id and user_id = uid) then
    return inv.household_id;
  end if;
  if exists (select 1 from public.household_members where user_id = uid) then
    raise exception 'You already belong to a household';
  end if;
  if inv.accepted_at is not null then
    raise exception 'This invite link has already been used';
  end if;
  if inv.expires_at < now() then
    raise exception 'This invite link has expired';
  end if;

  select count(*) into member_count from public.household_members where household_id = inv.household_id;
  select max_members into cap from public.households where id = inv.household_id;
  if member_count >= cap then
    raise exception 'This household is already full';
  end if;

  insert into public.household_members (household_id, user_id, role) values (inv.household_id, uid, 'member');
  update public.household_invites set accepted_by = uid, accepted_at = now() where id = inv.id;

  update public.areas set owner_id = uid
  where household_id = inv.household_id and owner_id is null;

  update public.tasks t set assignee_id = uid
  where t.household_id = inv.household_id
    and t.assignee_id is null
    and t.status = 'open'
    and exists (select 1 from public.areas a where a.id = t.area_id and a.owner_id = uid);

  return inv.household_id;
end;
$$;

-- Hand an area to someone else, recording it for the weekly review.
-- Open tasks assigned to the previous owner move with the area.
create function public.hand_off_area(p_area_id uuid, p_to_user uuid, p_note text default null)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  a public.areas;
begin
  select * into a from public.areas where id = p_area_id for update;
  if not found then
    raise exception 'Area not found';
  end if;
  if a.owner_id is not distinct from p_to_user then
    return;
  end if;

  update public.areas set owner_id = p_to_user where id = a.id;

  update public.tasks set assignee_id = p_to_user
  where area_id = a.id and status = 'open'
    and (assignee_id is not distinct from a.owner_id);

  insert into public.area_handoffs (household_id, area_id, from_user, to_user, note, created_by)
  values (a.household_id, a.id, a.owner_id, p_to_user, nullif(trim(coalesce(p_note, '')), ''), auth.uid());
end;
$$;

revoke all on function public.create_household(text, text) from public, anon;
revoke all on function public.create_invite(uuid, text) from public, anon;
revoke all on function public.get_invite(text) from public, anon;
revoke all on function public.accept_invite(text) from public, anon;
revoke all on function public.hand_off_area(uuid, uuid, text) from public, anon;
grant execute on function public.create_household(text, text) to authenticated;
grant execute on function public.create_invite(uuid, text) to authenticated;
grant execute on function public.get_invite(text) to authenticated;
grant execute on function public.accept_invite(text) to authenticated;
grant execute on function public.hand_off_area(uuid, uuid, text) to authenticated;
