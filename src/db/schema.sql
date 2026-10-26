-- SPRINT 1: profiles, movies, listed

CREATE TABLE IF NOT EXISTS public.Users(
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    genre_preference INT[] NOT NULL DEFAULT '{}',
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS public.Movies(
    movie_id BIGINT PRIMARY KEY,
    title TEXT NOT NULL,
    movie_desc TEXT,
    RELEASE_DATE DATE,
    rating NUMERIC(3,1) CHECK (rating >= 0 AND rating <= 10),
    genre INT[] NOT NULL DEFAULT '{}',
    poster_path TEXT,
    cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS public.Listed(
    user_id UUID REFERENCES public.Users(user_id) ON DELETE CASCADE,
    movie_id BIGINT REFERENCES public.Movies(movie_id) ON DELETE CASCADE,
    status  TEXT NOT NULL CHECK (STATUS IN ('liked', 'watchlist', 'disliked', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY(user_id, movie_id)
    );

-- speeds up searching for movies on a users list
CREATE INDEX IF NOT EXISTS listed_movie_idx  ON public.Listed (movie_id);
CREATE INDEX IF NOT EXISTS listed_status_idx ON public.Listed (user_id, status);

    --handling updating for signups for user table

CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY definer
    SET search_path = public


    --need to make sure on signup usernames are always UNIQUE
    AS $$
        BEGIN
        INSERT INTO public.Users(user_id, username)
        VALUES (new.id, new.raw_user_meta_data ->> 'name');
        RETURN new;
        END;
    $$;

 -- creates an event once a new user is inserted into auth table in supabase.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- row level security for tables
-- adds restrictions to users from altering tables on supabase

ALTER TABLE public.Users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.Movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.Listed ENABLE ROW LEVEL SECURITY;

--Users: any signd in user can read (necessary for username search)
--only can create or change own row

CREATE POLICY "Profiles are readable by signed-in Users"
ON public.Users FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users insert their own profile"
ON public.Users FOR INSERT TO authenticated WITH 
CHECK (user_id = auth.uid());

CREATE POLICY "Users update their own profile"
ON public.Users FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

--movies shared cache. Signed in users can read and refresh rows.
CREATE POLICY "Movies are readable by signed-in users"
ON public.Movies FOR SELECT TO authenticated USING(true);

CREATE POLICY "Signed in users can cache Movies"
ON public.Movies FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Signed in users can refresh Movies"
ON public.Movies FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

--Listed: owner-only for now
CREATE POLICY "Users read their own list"
ON public.Listed FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "users add to their own lists"
ON public.Listed FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users change their own lists"
ON public.Listed FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete their own lists"
ON public.Listed FOR DELETE TO authenticated USING (user_id = auth.uid());


-- SPRINT 2 TABLES Friends, Groups, and Members

CREATE TABLE IF NOT EXISTS public.Friends(
    f_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES public.Users(user_id) ON DELETE CASCADE,
    addressee_id UUID NOT NULL REFERENCES public.Users(user_id) ON DELETE CASCADE,
    f_status TEXT NOT NULL DEFAULT 'Pending' CHECK (f_Status IN ('Pending', 'Rejected', 'Accepted')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (requester_id <> addressee_id),
    UNIQUE (requester_id, addressee_id)
);

CREATE INDEX IF NOT EXISTS friends_addressee_idx on public.Friends(addressee_id);


CREATE TABLE IF NOT EXISTS public.Groups(
    group_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    owner_id UUID NOT NULL REFERENCES public.Users(user_id) ON DELETE CASCADE,

    -- creates a random code every time a group is created.
    join_code TEXT UNIQUE DEFAULT substr(md5(random()::TEXT), 1, 6),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.Members(
    user_id UUID REFERENCES public.Users(user_id) ON DELETE CASCADE,
    group_id UUID REFERENCES public.Groups(group_id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (user_id, group_id)
);

-- helper function that checks what users, users can see
CREATE OR REPLACE FUNCTION public.is_group_member(g uuid)
RETURNS BOOLEAN
LANGUAGE SQL
stable
SECURITY definer
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.members
    WHERE group_id = g AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_friend(other uuid)
RETURNS BOOLEAN
LANGUAGE SQL
stable
SECURITY definer
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friends
    WHERE f_status = 'Accepted'
      AND ((requester_id = auth.uid() AND addressee_id = other)
        OR (addressee_id = auth.uid() AND requester_id = other))
  );
$$;

-- Row level security for friends, groups, and members
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- friends
CREATE POLICY "user sees their own friends rows"
ON public.friends FOR SELECT TO authenticated
USING (requester_id = auth.uid() OR addressee_id = auth.uid());

CREATE POLICY "users send friend requests"
ON public.friends FOR INSERT TO authenticated
WITH CHECK (requester_id = auth.uid() AND f_status = 'Pending');

CREATE POLICY "addressee responds to requests"
ON public.friends FOR UPDATE TO authenticated
USING (addressee_id = auth.uid())
WITH CHECK (addressee_id = auth.uid());

CREATE POLICY "either side can remove a friendship"
ON public.friends FOR DELETE TO authenticated
USING (requester_id = auth.uid() OR addressee_id = auth.uid());

CREATE POLICY "friends can read each other's lists"
ON public.listed FOR SELECT TO authenticated
USING (public.is_friend(user_id));

-- groups
CREATE POLICY "members and owner can see a group"
ON public.groups FOR SELECT TO authenticated
USING (owner_id = auth.uid() OR public.is_group_member(group_id));

CREATE POLICY "users create groups they own"
ON public.groups FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "owner updates the group"
ON public.groups FOR UPDATE TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "owner deletes the group"
ON public.groups FOR DELETE TO authenticated
USING (owner_id = auth.uid());

-- members
CREATE POLICY "members can see who is in their group"
ON public.members FOR SELECT TO authenticated
USING (public.is_group_member(group_id)
  OR EXISTS (SELECT 1 FROM public.groups g
             WHERE g.group_id = members.group_id AND g.owner_id = auth.uid()));

CREATE POLICY "owner adds members"
ON public.members FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.groups g
                    WHERE g.group_id = members.group_id AND g.owner_id = auth.uid()));

CREATE POLICY "owner removes members or users leave"
ON public.members FOR DELETE TO authenticated
USING (user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.groups g
             WHERE g.group_id = members.group_id AND g.owner_id = auth.uid()));

CREATE POLICY "group members can read each other's lists"
ON public.listed FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1
  FROM public.members m1
  JOIN public.members m2 ON m1.group_id = m2.group_id
  WHERE m1.user_id = auth.uid() AND m2.user_id = listed.user_id
));