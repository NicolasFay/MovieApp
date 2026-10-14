import { StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import type { Movie } from '@/data/movies';

export function MovieCard({ movie }: { movie: Movie }) {
  return (
    <View style={[styles.card, { backgroundColor: movie.color }]}>
      <View style={styles.info}>
        <Text style={styles.title}>{movie.title}</Text>
        <Text style={styles.meta}>
          {movie.year} · {movie.genre}
        </Text>
        <Text style={styles.description}>{movie.description}</Text>
      </View>
    </View>
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