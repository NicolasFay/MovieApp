const TOKEN = process.env.EXPO_PUBLIC_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

export async function getMovies() {
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

getMovies();