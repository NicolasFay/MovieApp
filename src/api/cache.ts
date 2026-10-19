import { formatMovies, getGenres, getMovies, type Movie } from './tmdb';

let activeQueue: Movie[] = [];
let backupQueue: Movie[] = [];
let currentPage = 1;
let isFetching = false;
let genres: any[] = [];

export async function populateCache() {
    // initializes the active and backup queues with movies
    // fetches the first page of movies from tmdb and then switches 
    // to the next page for the next call
    genres = await getGenres();
    const movies = await getMovies(currentPage);
    const formattedMovies = formatMovies(movies, genres);

    currentPage++;

    activeQueue = formattedMovies.slice(0, 5);
    backupQueue = formattedMovies.slice(5);
}

export function getNextMovie(): Movie | undefined {
    // removes first movie from the queue and returns it
    return activeQueue.shift();
}

export function refillActiveQueue() {
    // refills the active queue with movies from the backup once active queue
    // has a movie removed
    if (activeQueue.length < 5 && backupQueue.length > 0) {
        // activeQueue.push(backupQueue.shift());
        const movie = backupQueue.shift();

        if (movie) {
            activeQueue.push(movie);
        }
    }
}

export async function refillBackupQueue() {
    // refills the backup queue with new movies when too low
    if (backupQueue.length >= 5 || !isFetching) {
        return;
    }

    isFetching = true;

    try {
        // fetchesthe next page of movies for backup
        const movies = await getMovies(currentPage);
        const formattedMovies = formatMovies(movies, genres);
        backupQueue.push(...formattedMovies);
        currentPage++;
    } finally {
        isFetching = false;
    }
}