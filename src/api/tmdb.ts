const TOKEN = process.env.EXPO_PUBLIC_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

export async function getMovies() {
    // fetches popular movies from tmdb
    try {
        const response = await fetch(`${BASE_URL}/movie/popular?api_key=${TOKEN}`);
        const data = await response.json();
        console.log(data);
        return data.results;
    } catch (error) {
        console.error('Error fetching movies:', error);
        throw error;
    }
};

export function formatMovies(movies: any[]) {
    // formats fetched movies for Supabase table
    return movies.map((movie) => ({
        movie_id: movie.id,
        title: movie.title,
        movie_desc: movie.overview,
        release_date: movie.release_date,
        genres: movie.genre_ids,
        poster_path: movie.poster_path
    }));
}

// getMovies();