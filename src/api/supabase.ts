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

