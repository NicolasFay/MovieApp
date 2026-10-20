import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ListType, Movie, getList } from '@/db/dbFunctions';

const POSTER_BASE = 'https://image.tmdb.org/t/p/w185';

type Props = {
  status: ListType;
};

export function MovieList({ status }: Props) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // runs on first load and each time the user switches lists
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getList(status)
      .then((data) => {
        if (!cancelled) setMovies(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message ?? 'Something went wrong');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // ignores results from a tab the user already left
    return () => {
      cancelled = true;
    };
  }, [status]);

  //checks and returns if app is loading, has an error, or is empty.
  if (loading) return <ActivityIndicator style={styles.center} />;
  if (error) return <ThemedText>Couldn't load this list: {error}</ThemedText>;
  if (movies.length === 0) return <ThemedText>Nothing here yet. Go swipe some movies!</ThemedText>;

  return (
    //draws one row per movie
    <FlatList
      data={movies}
      keyExtractor={(movie) => String(movie.movie_id)}
      renderItem={({ item }) => (
        <View style={styles.row}>
          {item.poster_path ? (
            <Image source={{ uri: POSTER_BASE + item.poster_path }} style={styles.poster} />
          ) : (
            <View style={styles.poster} />
          )}
          <View style={styles.info}>
            <ThemedText type="smallBold">{item.title}</ThemedText>
            {item.rating != null && <ThemedText>{item.rating}</ThemedText>}
            {item.genre != null && <ThemedText>{item.genre}</ThemedText>}
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { marginTop: 24 },
  row: { flexDirection: 'row', gap: 12, paddingVertical: 8 },
  poster: { width: 60, height: 90, borderRadius: 6, backgroundColor: '#444' },
  info: { flex: 1, justifyContent: 'center' },
});