import { formatMovies, getGenres, getMovies, type Movie } from './tmdb';

const ACTIVE_SIZE = 5; // movies in the active window
const BACKUP_MIN = 5; // fetch another page when the backup drops below 

let activeQueue: Movie[] = [];
let backupQueue: Movie[] = [];
let currentPage = 1;
let isFetching = false;
let populating: Promise<void> | null = null; // Promise that resolves when the cache is populated
// ^ stops multiple calls to populateCache from making multiple requests to tmdb
let genres: any[] = [];

export function populateCache(): Promise<void> {
    // initializes the active and backup queues with movies.
    // calling it more than once shares a single request.
    if (!populating) {
        populating = loadFirstPage().catch((error) => {
            populating = null; // resets the promise to allow a retry after a failure
            throw error;
        });
    }
    return populating;
}

async function loadFirstPage() {
    genres = await getGenres(); // grab our genre list from tmdb to use for formatting the movies later
    const movies = await getMovies(currentPage);
    const formattedMovies = formatMovies(movies, genres);

    currentPage++;

    activeQueue = formattedMovies.slice(0, ACTIVE_SIZE);
    backupQueue = formattedMovies.slice(ACTIVE_SIZE);
}

export function getNextMovie(): Movie | undefined {
    // removes first movie from the queue and returns it
    return activeQueue.shift();
}

export function refillActiveQueue() {
    // refills the active queue with movies from the backup once active queue
    // has a movie removed
    if (activeQueue.length < ACTIVE_SIZE && backupQueue.length > 0) {
        // activeQueue.push(backupQueue.shift());
        const movie = backupQueue.shift();
        if (movie) {
            activeQueue.push(movie);
        }
    }
}

export async function refillBackupQueue() {
    // refills the backup queue with new movies when too low and isnt fetching
    if (backupQueue.length >= BACKUP_MIN || isFetching) {
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

export function getActiveQueue(): Movie[] {
    // return a copy of the active queue
    return [...activeQueue];
}