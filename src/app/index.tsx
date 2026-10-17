import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MovieCard } from '@/components/movie-card';
import { SwipeDeck } from '@/components/swipe-deck';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { MOVIES, type Movie } from '@/data/movies';

export default function HomeScreen() {
  const handleSwipeLeft = (movie: Movie) => {
    // TODO: Handle swipe action (e.g., update state, make API call, etc.)
  }

  const handleSwipeRight = (movie: Movie) => {
    // TODO: Handle swipe action (e.g., update state, make API call, etc.)
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <SwipeDeck
          data={MOVIES} // pulls from the base movie data rn
          renderCard={(movie) => <MovieCard movie={movie} />}
          onSwipeLeft={handleSwipeLeft} // hooks up the swipe left action to the handleSwipeLeft function
          onSwipeRight={handleSwipeRight} // hooks up the swipe right action to the handleSwipeRight function
        />
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
});