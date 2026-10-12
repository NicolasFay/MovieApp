-- ============================================================
-- MovieApp schema (Supabase / PostgreSQL)
-- Paste into Supabase Dashboard -> SQL Editor -> New query -> Run
-- Safe to run once on a fresh project. Sprint 1 tables come first,
-- Sprint 2 tables (friends, groups) are in the second half.
-- ============================================================


-- ============================================================
-- SPRINT 1: profiles, movies, listed
-- ============================================================

-- PROFILES (the "User" entity). id matches Supabase's auth.users id.
create table if not exists public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  username         text unique,
  name             text,
  genre_preference int[] not null default '{}',   -- TMDB genre ids
  avatar_url       text,
  created_at       timestamptz not null default now()
);

-- MOVIES (cache of TMDB data). id is the TMDB movie id.
create table if not exists public.movies (
  id            bigint primary key,               -- TMDB id
  title         text not null,
  description   text,
  release_date  date,
  trailer_url   text,
  genres        int[] not null default '{}',      -- TMDB genre ids
  poster_path   text,
  cached_at     timestamptz not null default now()
);

-- LISTED (one row per user per movie; status = which list it is on)
create table if not exists public.listed (
  user_id    uuid   not null references public.profiles(id) on delete cascade,
  movie_id   bigint not null references public.movies(id)   on delete cascade,
  status     text   not null check (status in ('liked', 'watchlist', 'disliked', 'rejected')),
  created_at timestamptz not null default now(),
  primary key (user_id, movie_id)
);

create index if not exists listed_movie_idx  on public.listed (movie_id);
create index if not exists listed_status_idx on public.listed (user_id, status);


-- ------------------------------------------------------------
-- Auto-create a profile row when someone signs up
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, new.raw_user_meta_data ->> 'name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ------------------------------------------------------------
-- Row Level Security: Sprint 1 tables
-- ------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.movies   enable row level security;
alter table public.listed   enable row level security;

-- profiles: any signed-in user can read (needed for username search),
-- but you can only create/change your own row.
create policy "profiles are readable by signed-in users"
  on public.profiles for select to authenticated
  using (true);

create policy "users insert their own profile"
  on public.profiles for insert to authenticated
  with check (id = auth.uid());

create policy "users update their own profile"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- movies: shared cache. Signed-in users can read and add/refresh rows.
create policy "movies are readable by signed-in users"
  on public.movies for select to authenticated
  using (true);

create policy "signed-in users can cache movies"
  on public.movies for insert to authenticated
  with check (true);

create policy "signed-in users can refresh cached movies"
  on public.movies for update to authenticated
  using (true)
  with check (true);

-- listed: owner-only for now (friend read access is added below).
create policy "users read their own lists"
  on public.listed for select to authenticated
  using (user_id = auth.uid());

create policy "users add to their own lists"
  on public.listed for insert to authenticated
  with check (user_id = auth.uid());

create policy "users change their own lists"
  on public.listed for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "users remove from their own lists"
  on public.listed for delete to authenticated
  using (user_id = auth.uid());


-- ============================================================
-- SPRINT 2: friends, groups, members
-- (You can run this half later if you only want Sprint 1 now.)
-- ============================================================

-- FRIENDS (user-to-user, many-to-many)
create table if not exists public.friends (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references public.profiles(id) on delete cascade,
  addressee_id  uuid not null references public.profiles(id) on delete cascade,
  status        text not null default 'pending'
                  check (status in ('pending', 'accepted', 'declined')),
  created_at    timestamptz not null default now(),
  check (requester_id <> addressee_id),
  unique (requester_id, addressee_id)
);

create index if not exists friends_addressee_idx on public.friends (addressee_id);

-- GROUPS
create table if not exists public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  join_code   text unique default substr(md5(random()::text), 1, 6),
  created_at  timestamptz not null default now()
);

-- MEMBERS (user-to-group, many-to-many)
create table if not exists public.members (
  group_id   uuid not null references public.groups(id)   on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  joined_at  timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index if not exists members_user_idx on public.members (user_id);


-- Helper functions. security definer lets policies check membership /
-- friendship without triggering recursive RLS lookups.
create or replace function public.is_group_member(g uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.members
    where group_id = g and user_id = auth.uid()
  );
$$;

create or replace function public.is_friend(other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.friends
    where status = 'accepted'
      and ((requester_id = auth.uid() and addressee_id = other)
        or (addressee_id = auth.uid() and requester_id = other))
  );
$$;


-- ------------------------------------------------------------
-- Row Level Security: Sprint 2 tables
-- ------------------------------------------------------------
alter table public.friends enable row level security;
alter table public.groups  enable row level security;
alter table public.members enable row level security;

-- friends
create policy "users see their own friend rows"
  on public.friends for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

create policy "users send friend requests"
  on public.friends for insert to authenticated
  with check (requester_id = auth.uid() and status = 'pending');

create policy "addressee responds to requests"
  on public.friends for update to authenticated
  using (addressee_id = auth.uid())
  with check (addressee_id = auth.uid());

create policy "either side can remove a friendship"
  on public.friends for delete to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

-- listed: let accepted friends read each other's lists
create policy "friends can read each other's lists"
  on public.listed for select to authenticated
  using (public.is_friend(user_id));

-- groups
create policy "members and owner can see a group"
  on public.groups for select to authenticated
  using (owner_id = auth.uid() or public.is_group_member(id));

create policy "users create groups they own"
  on public.groups for insert to authenticated
  with check (owner_id = auth.uid());

create policy "owner updates the group"
  on public.groups for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "owner deletes the group"
  on public.groups for delete to authenticated
  using (owner_id = auth.uid());

-- members
create policy "members can see who is in their group"
  on public.members for select to authenticated
  using (public.is_group_member(group_id)
         or exists (select 1 from public.groups g
                    where g.id = group_id and g.owner_id = auth.uid()));

create policy "owner adds members"
  on public.members for insert to authenticated
  with check (exists (select 1 from public.groups g
                      where g.id = group_id and g.owner_id = auth.uid()));

create policy "owner removes members or users leave"
  on public.members for delete to authenticated
  using (user_id = auth.uid()
         or exists (select 1 from public.groups g
                    where g.id = group_id and g.owner_id = auth.uid()));

-- Let group members read each other's lists (for the combined group list)
create policy "group members can read each other's lists"
  on public.listed for select to authenticated
  using (exists (
    select 1
    from public.members m1
    join public.members m2 on m1.group_id = m2.group_id
    where m1.user_id = auth.uid() and m2.user_id = listed.user_id
  ));
