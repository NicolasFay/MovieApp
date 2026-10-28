import { ImageBackground, StyleSheet, Text, View } from 'react-native';

import type { Movie } from '@/api/tmdb';
import { Spacing } from '@/style/theme';

export function MovieCard({ movie }: { movie: Movie }) {
  return (
    <ImageBackground
      source={{ uri: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : undefined }}
      style={[styles.card]}
    >
      <View style={styles.info}>
        <Text style={styles.title}>{movie.title}</Text>
        <Text style={styles.meta}>
          {movie.release_date} · {movie.genres.join(', ')}
        </Text>
        <Text style={styles.description}>{movie.overview}</Text>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: Spacing.four,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  info: {
    padding: Spacing.four,
    gap: Spacing.one,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  title: { color: 'white', fontSize: 28, fontWeight: '700' },
  meta: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  description: { color: 'white', fontSize: 16, marginTop: Spacing.one },
});