import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function insertMovies(movies: any[]) {
  // adds an array of movies formatted from the TMDB api
  // to the Supabase Movies table and avoids duplicates
  const { error } = await supabase.from('Movies')
                                  .upsert(movies, { onConflict: 'movie_id' });
  if (error) {
      console.error('Error inserting movies:', error);
      throw error;
  }
}

export async function getMoviesFromSupabase() {
  // fetches all the movies from the Supabase Movies table
  const { data, error } = await supabase.from('Movies').select('*');
  if (error) {
      console.error('Error fetching movies:', error);
      throw error;
  }
  return data;
}



// The four values allowed in Listed.status (matches the SQL CHECK constraint).
export type Status = 'liked' | 'watchlist' | 'disliked' | 'rejected';

// The three lists that get a tab on the lists screen
export type ListType = Exclude<Status, 'rejected'>;

// Shape of a row in the Movies table.
export type Movie = {
  movie_id: number;
  title: string;
  movie_desc: string | null;
  release_date: string | null;
  genre: number[];
  poster_path: string | null;
  rating: number | null;
};

// helper function: who is logged in right now
async function getUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Not signed in');
  return data.user.id;
}

// Add / Update function
// 1) make sure the movie exists in Movies (the foreign key requires it)
// 2) save or change this user's status for it
// upsert = insert if new, update if the row already exists, so swiping on a
// movie again (or moving it to another list) is the same call.
export async function saveSwipe(movie: Movie, status: Status) {
  const userId = await getUserId();

  const { error: movieError } = await supabase
    .from('movies')
    .upsert(movie, { onConflict: 'movie_id' });
  if (movieError) throw movieError;

  const { error } = await supabase
    .from('listed')
    .upsert(
      { user_id: userId, movie_id: movie.movie_id, status },
      { onConflict: 'user_id,movie_id' }
    );
  if (error) throw error;
}

// Reads all movies on one of the user's lists, newest first.
export async function getList(status: ListType): Promise<Movie[]> {
  const userId = await getUserId();

  const { data, error } = await supabase
    .from('listed')
    .select('created_at, movies(*)') // joins through the movie_id foreign key
    .eq('user_id', userId)
    .eq('status', status)
    .order('created_at', { ascending: false });
  if (error) throw error;

  // Each row looks like { created_at, movies: { ...movie } }
  return (data ?? []).map((row: any) => row.movies as Movie);
}

// Reads ids of every movie the user already swiped on (any status, including
// rejected), so the swipe deck can skip them.
export async function getSwipedMovieIds(): Promise<number[]> {
  const userId = await getUserId();

  const { data, error } = await supabase
    .from('listed')
    .select('movie_id')
    .eq('user_id', userId);
  if (error) throw error;

  return (data ?? []).map((row) => row.movie_id as number);
}

// Updates a movie to a different list.
export async function changeStatus(movieId: number, status: Status) {
  const userId = await getUserId();

  const { error } = await supabase
    .from('listed')
    .update({ status })
    .eq('user_id', userId)
    .eq('movie_id', movieId);
  if (error) throw error;
}

// Removes a movie off the user's lists entirely.
export async function removeFromLists(movieId: number) {
  const userId = await getUserId();

  const { error } = await supabase
    .from('listed')
    .delete()
    .eq('user_id', userId)
    .eq('movie_id', movieId);
  if (error) throw error;
}

export type UserProfile = {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
};

// Search users by username (case-insensitive, partial match), excluding yourself
export async function searchUsers(query: string): Promise<UserProfile[]> {
  const q = query.trim();
  if (!q) return [];
  const myId = await getUserId();

  const { data, error } = await supabase
    .from('users')
    .select('user_id, username, avatar_url')
    .ilike('username', `%${q}%`)
    .neq('user_id', myId)
    .limit(20);
  if (error) throw error;

  return data ?? [];
}