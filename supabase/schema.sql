-- Gather meal planner schema. Run in the Supabase SQL editor.
create extension if not exists pgcrypto;
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(), name text not null default 'Our home', created_by uuid not null references auth.users(id) on delete cascade, created_at timestamptz not null default now()
);
create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade, role text not null default 'member' check (role in ('owner','member')), created_at timestamptz not null default now(), primary key (household_id,user_id), unique(user_id)
);
create table if not exists public.recipes (
  id text primary key, household_id uuid not null references public.households(id) on delete cascade, name text not null, url text, servings numeric not null default 2 check(servings>0), ingredients jsonb not null default '[]'::jsonb, instructions text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.meals (
  id text primary key, household_id uuid not null references public.households(id) on delete cascade, date date not null, meal_type text not null default 'Dinner', title text not null, recipe_id text references public.recipes(id) on delete set null, who text not null default 'both' check(who in ('both','him','me')), servings numeric not null default 2 check(servings>0), status text not null default 'planned' check(status in ('planned','leftover','skipped')), leftover_from text references public.meals(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.pantry_items (
  id text primary key, household_id uuid not null references public.households(id) on delete cascade, name text not null, quantity numeric not null default 0 check(quantity>=0), unit text not null default 'each', category text, expires_on date, updated_at timestamptz not null default now()
);
create table if not exists public.grocery_checks (
  id text primary key, household_id uuid not null references public.households(id) on delete cascade, week_start date not null, ingredient_key text not null, checked boolean not null default false, updated_at timestamptz not null default now(), unique(household_id,week_start,ingredient_key)
);
create index if not exists meals_household_date_idx on public.meals(household_id,date);
create index if not exists recipes_household_idx on public.recipes(household_id);
create index if not exists pantry_household_idx on public.pantry_items(household_id);

create or replace function public.is_household_member(hid uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.household_members hm where hm.household_id=hid and hm.user_id=auth.uid()); $$;
grant execute on function public.is_household_member(uuid) to authenticated;

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.recipes enable row level security;
alter table public.meals enable row level security;
alter table public.pantry_items enable row level security;
alter table public.grocery_checks enable row level security;

create policy "members can view their households" on public.households for select to authenticated using (public.is_household_member(id) or created_by=auth.uid());
create policy "signed-in users can create a household" on public.households for insert to authenticated with check (created_by=auth.uid());
create policy "members can update their households" on public.households for update to authenticated using (public.is_household_member(id)) with check (public.is_household_member(id));
create policy "members can view household membership" on public.household_members for select to authenticated using (public.is_household_member(household_id) or user_id=auth.uid());
create policy "owner can add household members" on public.household_members for insert to authenticated with check (user_id=auth.uid() or exists(select 1 from public.household_members x where x.household_id=household_id and x.user_id=auth.uid() and x.role='owner'));
create policy "members can remove household membership" on public.household_members for delete to authenticated using (user_id=auth.uid() or exists(select 1 from public.household_members x where x.household_id=household_id and x.user_id=auth.uid() and x.role='owner'));
create policy "household members manage recipes" on public.recipes for all to authenticated using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "household members manage meals" on public.meals for all to authenticated using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "household members manage pantry" on public.pantry_items for all to authenticated using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "household members manage grocery checks" on public.grocery_checks for all to authenticated using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));

-- Enable realtime for tables used by the app. If already present, ignore duplicate publication errors.
do $$ begin alter publication supabase_realtime add table public.meals; exception when duplicate_object then null; when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.recipes; exception when duplicate_object then null; when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.pantry_items; exception when duplicate_object then null; when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.grocery_checks; exception when duplicate_object then null; when others then null; end $$;
