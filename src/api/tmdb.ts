const TOKEN = process.env.EXPO_PUBLIC_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

export async function getMovies(page: number) {
    // fetches popular movies from tmdb
    try {
        const response = await fetch(`${BASE_URL}/movie/popular?api_key=${TOKEN}&page=${page}`);
        const data = await response.json();
        console.log(data);
        return data.results;
    } catch (error) {
        console.error('Error fetching movies:', error);
        throw error;
    }
};

export async function getGenres() {
    // gets the list of genres from tmdb to convert genre id to string name
    const response = await fetch(`${BASE_URL}/genre/movie/list?api_key=${TOKEN}`);

    if (!response.ok) {
        throw new Error(`Failed to fetch genres: ${response.statusText}`);
    }
    const data = await response.json();
    console.log(data);
    return data.genres;
}

export function formatGenres(genreIds: number[], genres: any[]) {
    // converts genres from id to string name for inserting into Supabase Movies table
    // takes in an array of genre ids to convert and the array of genres definitions
    return genreIds.map((id) => {
        const genre = genres.find((g) => g.id === id);
        return genre ? genre.name : "Unknown";
    });
}

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

// getMovies(2);
// getGenres();