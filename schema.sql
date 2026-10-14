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
    trailer_url TEXT,
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
  on public.Listed for INSERT TO authenticated
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