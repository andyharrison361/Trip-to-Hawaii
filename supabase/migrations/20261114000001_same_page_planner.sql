-- Same Page — planner core
-- 1. Items come in three kinds: tasks (one-off to-dos), chores (household
--    routines) and events (things that happen at a time and place).
-- 2. Kids' profiles: household people who don't sign in, so items can be
--    tagged "for Emma" and the planner can be filtered per child.

-- ---------------------------------------------------------------------------
-- Kids
-- ---------------------------------------------------------------------------
create table public.kids (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 40),
  -- One of the planner's named colors (see src/lib/colors.ts).
  color text not null default 'sky',
  birthday date,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index kids_household_idx on public.kids (household_id, sort_order);

alter table public.kids enable row level security;

create policy "members manage kids" on public.kids
  for all to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

-- ---------------------------------------------------------------------------
-- Item kinds, events, kid tags
-- ---------------------------------------------------------------------------
alter table public.tasks
  add column kind text not null default 'task' check (kind in ('task', 'chore', 'event')),
  add column end_time time,
  add column location text not null default '',
  add column kid_ids uuid[] not null default '{}';

create index tasks_household_kind_due_idx on public.tasks (household_id, kind, due_date);
create index tasks_kid_ids_idx on public.tasks using gin (kid_ids);

-- Events must have a date, and an end time can't come before the start.
alter table public.tasks
  add constraint tasks_event_has_date check (kind <> 'event' or due_date is not null),
  add constraint tasks_end_after_start check (end_time is null or due_time is null or end_time >= due_time);

-- Extend the household reference check to cover kid tags.
create or replace function public.check_household_refs()
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
    if cardinality(new.kid_ids) > 0 and exists (
      select 1 from unnest(new.kid_ids) as k(id)
      where not exists (
        select 1 from public.kids where kids.id = k.id and kids.household_id = new.household_id
      )
    ) then
      raise exception 'That child is not part of this household';
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

-- Removing a kid's profile untags them everywhere (items themselves stay).
create function public.untag_deleted_kid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.tasks
  set kid_ids = array_remove(kid_ids, old.id)
  where household_id = old.household_id and old.id = any (kid_ids);
  return old;
end;
$$;

create trigger kids_untag_on_delete
  after delete on public.kids
  for each row execute function public.untag_deleted_kid();
