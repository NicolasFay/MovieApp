import { getMovies } from './tmdb';

let activeQueue: any[] = [];
let backupQueue: any[] = [];
let currentPage = 1;
let isFetching = false;

export async function populateCache() {
    // initializes the active and backup queues with movies
    // fetches the first page of movies from tmdb and then switches 
    // to the next page for the next call
    const movies = await getMovies(currentPage);
    currentPage++;
    activeQueue = movies.slice(0, 5);
    backupQueue = movies.slice(5);
}

export function getNextMovie() {
    // removes first movie from the queue and returns it
    return activeQueue.shift();
}

export function refillActiveQueue() {
    // refills the active queue with movies from the backup once active queue
    // has a movie removed
    if (activeQueue.length < 5 && backupQueue.length > 0) {
        activeQueue.push(backupQueue.shift());
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
        backupQueue.push(...movies);
        currentPage++;
    } finally {
        isFetching = false;
    }
}