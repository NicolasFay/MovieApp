import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  ListType,
  Movie,
  changeStatus,
  getList,
  removeFromLists,
} from '@/db/dbFunctions';

const POSTER_BASE = 'https://image.tmdb.org/t/p/w185';

type ListChoice = {
  value: ListType;
  label: string;
};

type Props = {
  status: ListType;
  listChoices: readonly ListChoice[];
};

export function MovieList({ status, listChoices }: Props) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [choosingList, setChoosingList] = useState(false);
  const [saving, setSaving] = useState(false);

  // Incrementing this reloads the currently selected list after a change.
  const [refreshKey, setRefreshKey] = useState(0);

  // The ref blocks duplicate actions before React updates the UI.
  const savingRef = useRef(false);
  // Track whether the component is still mounted before updating UI after a save
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
    };
  }, []);

  //Close the movie menu when the user switches lists
  useEffect(() => {
    setSelectedMovie(null);
    setChoosingList(false);
  }, [status]);

  //Load movies on mount, when switching lists, and after a saved change
  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    getList(status)
      .then(data => {
        if (!cancelled) setMovies(data);
      })
      .catch(error => {
        if (!cancelled) {
          setError(
            error instanceof Error ? error.message : 'Something went wrong'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      // Ignore this request's result after switching lists, refreshing, or unmounting
      cancelled = true;
    };
  }, [status, refreshKey]);

  // Run a move or removal, handle saving errors, and refresh the list.
  async function saveChange(operation: () => Promise<unknown>) {
    
    if (savingRef.current) return;

    savingRef.current = true;
    setSaving(true);
    setSelectedMovie(null);
    setChoosingList(false);

    try {
      await operation();

      if (mountedRef.current) {
        // Reload whichever list is currently selected
        // Also handles the user switching lists while the database operation runs.
        setRefreshKey(current => current + 1);
      }
    } catch (error) {
      if (mountedRef.current) {
        Alert.alert(
          'Could not update movie',
          error instanceof Error ? error.message : 'Please try again.'
        );
      }
    } finally {
      savingRef.current = false;

      if (mountedRef.current) {
        setSaving(false);
      }
    }
  }

  // Ask confirmation before removing the movie from all lists
  function confirmRemoval(movie: Movie) {
    setSelectedMovie(null);
    setChoosingList(false);

    Alert.alert(
      'Remove movie?',
      `Remove "${movie.title}" from all your lists?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void saveChange(() =>
              removeFromLists(movie.movie_id)
            );
          },
        },
      ]
    );
  }

  // Close the menu and reset it to the main actions
  function closeMenu() {
    setSelectedMovie(null);
    setChoosingList(false);
  }

  // Exclude the current list from move destinations.
  const destinations = listChoices.filter(
    choice => choice.value !== status
  );

  if (loading) {
    return <ActivityIndicator style={styles.center} />;
  }

  if (error) {
    return (
      <View style={styles.center}>
        <ThemedText>Couldn't load this list: {error}</ThemedText>
        <Pressable
          accessibilityRole="button"
          onPress={() => setRefreshKey(current => current + 1)}
          style={styles.action}
        >
          <ThemedText>Try again</ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {saving && (
        <View style={styles.saving}>
          <ActivityIndicator />
          <ThemedText>Saving changes…</ThemedText>
        </View>
      )}

      <FlatList
        data={movies}
        extraData={saving}
        keyExtractor={movie => String(movie.movie_id)}
        ListEmptyComponent={
          <ThemedText>
            Nothing here yet. Go swipe some movies!
          </ThemedText>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            {item.poster_path ? (
              <Image
                source={{ uri: POSTER_BASE + item.poster_path }}
                style={styles.poster}
              />
            ) : (
              <View style={styles.poster} />
            )}

            <View style={styles.info}>
              <ThemedText type="smallBold">{item.title}</ThemedText>
              {item.rating != null && (
                <ThemedText>{item.rating}</ThemedText>
              )}
              {item.genre != null && (
                <ThemedText>{item.genre}</ThemedText>
              )}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Options for ${item.title}`}
              accessibilityState={{ disabled: saving }}
              disabled={saving}
              onPress={() => {
                setChoosingList(false);
                setSelectedMovie(item);
              }}
              style={styles.menuButton}
            >
              <ThemedText style={styles.menuIcon}>⋯</ThemedText>
            </Pressable>
          </View>
        )}
      />
      {/* Modal displays content on top of the screen. */}
      <Modal
        visible={selectedMovie !== null}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <View style={styles.modalContainer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close movie options"
            style={styles.backdrop}
            onPress={closeMenu}
          />

          <ThemedView style={styles.modalCard}>
            <ThemedText type="smallBold">
              {choosingList ? 'Move to another list' : selectedMovie?.title}
            </ThemedText>

            {choosingList ? (
              <>
                {destinations.map(choice => (
                  <Pressable
                    key={choice.value}
                    accessibilityRole="button"
                    style={styles.action}
                    onPress={() => {
                      if (!selectedMovie) return;

                      const movieId = selectedMovie.movie_id;

                      void saveChange(() =>
                        changeStatus(movieId, choice.value)
                      );
                    }}
                  >
                    <ThemedText>{choice.label}</ThemedText>
                  </Pressable>
                ))}

                {destinations.length === 0 && (
                  <ThemedText>No other lists available.</ThemedText>
                )}

                <Pressable
                  accessibilityRole="button"
                  style={styles.action}
                  onPress={() => setChoosingList(false)}
                >
                  <ThemedText>Back</ThemedText>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  accessibilityRole="button"
                  style={styles.action}
                  onPress={() => setChoosingList(true)}
                >
                  <ThemedText>Move to another list</ThemedText>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  style={styles.action}
                  onPress={() => {
                    if (selectedMovie) confirmRemoval(selectedMovie);
                  }}
                >
                  <ThemedText style={styles.destructive}>
                    Remove from all lists
                  </ThemedText>
                </Pressable>
              </>
            )}

            <Pressable
              accessibilityRole="button"
              style={styles.action}
              onPress={closeMenu}
            >
              <ThemedText>Cancel</ThemedText>
            </Pressable>
          </ThemedView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { marginTop: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  poster: {
    width: 60,
    height: 90,
    borderRadius: 6,
    backgroundColor: '#444',
  },
  info: { flex: 1, justifyContent: 'center' },
  menuButton: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: { fontSize: 28, lineHeight: 32 },
  saving: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    padding: 20,
    borderRadius: 16,
    gap: 8,
  },
  action: {
    minHeight: 48,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  destructive: { color: '#dc2626' },
});