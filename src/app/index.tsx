import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  getActiveQueue,
  getNextMovie,
  populateCache,
  refillActiveQueue,
  refillBackupQueue,
} from '@/api/cache';
import { type Movie } from '@/api/tmdb';
import { MovieCard } from '@/components/movie-card';
import { SwipeDeck } from '@/components/swipe-deck';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { saveSwipe } from '@/db/dbFunctions';
import { toDbMovie } from '@/db/dbHelpers';

// returns the deck's movies plus anything in the cache's active queue it doesn't have yet
function withNewMovies(current: Movie[]): Movie[] {
  // create a set of the ids of the movies currently in the deck  
  const seen = new Set(current.map((m) => m.id));
  // returns a copy of the cache’s current window, filters for new movies, and adds them to the end of the deck if any exist
  const fresh = getActiveQueue().filter((m) => !seen.has(m.id));
  // If there’s something new, it returns a new array with the old movies first and the new ones after
  return fresh.length > 0 ? [...current, ...fresh] : current;
  // if nothing new, it returns the current array unchanged, skips rerender
}

export default function HomeScreen() {
  // every movie handed to the deck so far
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMovies() {
      try {
        await populateCache();
        setMovies((latest) => withNewMovies(latest));
      } catch (error) {
        console.error('Error loading movies:', error);
      } finally {
        setLoading(false);
      }
    }

    loadMovies();
  }, []);

  // runs after every swipe, in any direction
  async function advanceDeck() {
    getNextMovie(); // the swiped movie leaves the active queue
    refillActiveQueue(); // a movie from the backup takes its place
    setMovies((latest) => withNewMovies(latest)); // hand the new movie to the deck

    try {
      // calling withNewMovies again is safe here because it checks for duplicates with seen,
      // and will not add a movie to the deck if it is already present
      await refillBackupQueue(); // fetches the next page if the backup is low
      refillActiveQueue(); // in case the backup had run dry
      setMovies((latest) => withNewMovies(latest));
    } catch (error) {
      console.error('Error refilling movie cache:', error);
    }
  }

  const handleSwipeLeft = (movie: Movie) => {
    advanceDeck();
    saveSwipe(toDbMovie(movie), 'disliked').catch((e) =>
      console.error('Failed to save swipe:', e)
    );
  }

  const handleSwipeRight = (movie: Movie) => {
    advanceDeck();
    saveSwipe(toDbMovie(movie), 'liked').catch((e) =>
      console.error('Failed to save swipe:', e)
    );
  }

  const handleSwipeUp = (movie: Movie) => {
    advanceDeck();
    saveSwipe(toDbMovie(movie), 'rejected').catch((e) =>
      console.error('Failed to save swipe:', e)
    );
  }

  const handleSwipeDown = (movie: Movie) => {
    advanceDeck();
    saveSwipe(toDbMovie(movie), 'watchlist').catch((e) =>
      console.error('Failed to save swipe:', e)
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {loading ? (
          <ActivityIndicator style={styles.loader} />
        ) : (
          <SwipeDeck
            data={movies}
            renderCard={(movie) => <MovieCard movie={movie} />}
            onSwipeLeft={handleSwipeLeft}
            onSwipeRight={handleSwipeRight}
            onSwipeUp={handleSwipeUp}
            onSwipeDown={handleSwipeDown}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    padding: Spacing.four,
    paddingBottom: Spacing.three,
  },
  loader: { marginTop: 24 },
});